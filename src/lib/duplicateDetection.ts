import prisma from '@/lib/prisma';
import { foldText } from '@/lib/textFold';

// toLocaleLowerCase('tr-TR') turns "I" into a dotless "ı", so "ATOMIC" would never equal "atomic".
// foldText lowercases ASCII and folds Turkish/accented letters, the same rules search uses.
const normalizeUsername = (value: string) => foldText(value.replace(/^@/, '').trim());
const normalizeUrl = (value: string) => foldText(value.trim()).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
const normalizeName = (value: string) => foldText(value.trim()).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function levenshtein(left: string, right: string) {
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1)); previous = old;
    }
  }
  return row[right.length];
}

// Reasons are language-neutral codes; clients translate them (profile.duplicateReason.*).
export type DuplicateReason = 'SAME_USERNAME' | 'SAME_URL' | 'SIMILAR_NAME';

/** Reasons that mean "this is the same account"; a similar display name alone only deserves a warning. */
export const BLOCKING_DUPLICATE_REASONS: DuplicateReason[] = ['SAME_USERNAME', 'SAME_URL'];

/** `only` restricts the result to profiles matching at least one of those reasons (and lists only those reasons). */
export async function findDuplicateProfiles(input: { username?: string; name?: string; urls?: string[]; excludeId?: string | null; only?: DuplicateReason[] }) {
  const username = normalizeUsername(input.username || '');
  const name = normalizeName(input.name || '');
  const urls = (input.urls || []).map(normalizeUrl).filter(Boolean);
  if (!username && !name && !urls.length) return [];
  const profiles = await prisma.profile.findMany({ where: input.excludeId ? { id: { not: input.excludeId } } : undefined, include: { platformLinks: { include: { platform: true } } }, orderBy: { updatedAt: 'desc' } });
  return profiles.flatMap((profile) => {
    const reasons: DuplicateReason[] = [];
    if (username && normalizeUsername(profile.username) === username) reasons.push('SAME_USERNAME');
    const profileUrls = profile.platformLinks.map((link) => normalizeUrl(link.url));
    if (urls.some((url) => profileUrls.includes(url))) reasons.push('SAME_URL');
    let score = 0;
    if (name.length >= 3) { score = 1 - levenshtein(name, normalizeName(profile.displayName)) / Math.max(name.length, normalizeName(profile.displayName).length); if (score >= 0.85) reasons.push('SIMILAR_NAME'); }
    const matched = input.only ? reasons.filter((reason) => input.only!.includes(reason)) : reasons;
    return matched.length ? [{ id: profile.id, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl, deletedAt: profile.deletedAt?.toISOString() || null, reasons: matched, similarity: score, platformLinks: profile.platformLinks.map((link) => ({ platformKey: link.platform.key, url: link.url })) }] : [];
  }).slice(0, 5);
}
