import prisma from './prisma';
import { foldSql, foldText } from './textFold';

const MAX_TERMS = 8;

// Every whitespace-separated term must match at least one searchable field (AND across terms).
// Matching is accent/case-insensitive for Turkish and common Latin letters (see textFold.ts).
export async function findSearchMatchIds(search: string, trashed: boolean): Promise<string[]> {
  const terms = foldText(search.trim()).split(/\s+/).filter(Boolean).slice(0, MAX_TERMS);
  if (!terms.length) return [];

  const termClause = `(
    instr(${foldSql('p."username"')}, ?) > 0
    OR instr(${foldSql('p."displayName"')}, ?) > 0
    OR instr(${foldSql(`COALESCE(p."bio", '')`)}, ?) > 0
    OR instr(${foldSql(`COALESCE(p."notes", '')`)}, ?) > 0
    OR EXISTS (SELECT 1 FROM "ProfileTag" pt JOIN "Tag" t ON t."id" = pt."tagId"
               WHERE pt."profileId" = p."id" AND instr(${foldSql('t."name"')}, ?) > 0)
    OR EXISTS (SELECT 1 FROM "PlatformLink" l
               WHERE l."profileId" = p."id" AND instr(${foldSql('l."url"')}, ?) > 0)
  )`;
  const sql = `SELECT p."id" AS id FROM "Profile" p
    WHERE p."deletedAt" IS ${trashed ? 'NOT ' : ''}NULL AND ${terms.map(() => termClause).join(' AND ')}`;
  const params = terms.flatMap((term) => Array(6).fill(term));
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(sql, ...params);
  return rows.map((row) => row.id);
}
