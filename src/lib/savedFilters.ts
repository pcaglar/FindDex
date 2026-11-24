import prisma from './prisma';
import { SavedFilterItem, sanitizeFilters } from './profileFilters';

export type { SavedFilterItem };

export const MAX_SAVED_FILTERS = 50;
export class SavedFilterInputError extends Error {}

type Row = { id: string; name: string; query: string; createdAt: Date };

function toItem(row: Row): SavedFilterItem {
  let parsed: unknown = {};
  try { parsed = JSON.parse(row.query); } catch { /* A corrupt row degrades to "show everything". */ }
  return { id: row.id, name: row.name, filters: sanitizeFilters(parsed), createdAt: row.createdAt.toISOString() };
}

export async function listSavedFilters(): Promise<SavedFilterItem[]> {
  const rows = await prisma.savedFilter.findMany({ orderBy: { name: 'asc' } });
  return rows.map(toItem);
}

/** Saving under an existing name replaces that filter. */
export async function saveFilter(nameInput: unknown, filtersInput: unknown): Promise<SavedFilterItem> {
  const name = typeof nameInput === 'string' ? nameInput.trim().slice(0, 60) : '';
  if (!name) throw new SavedFilterInputError('A name is required');
  const filters = sanitizeFilters(filtersInput);
  const query = JSON.stringify(filters);
  const existing = await prisma.savedFilter.findUnique({ where: { name } });
  if (!existing && (await prisma.savedFilter.count()) >= MAX_SAVED_FILTERS) {
    throw new SavedFilterInputError(`At most ${MAX_SAVED_FILTERS} saved filters`);
  }
  const row = await prisma.savedFilter.upsert({ where: { name }, update: { query }, create: { name, query } });
  return toItem(row);
}

export async function deleteSavedFilter(id: string) {
  const { count } = await prisma.savedFilter.deleteMany({ where: { id } });
  return count > 0;
}
