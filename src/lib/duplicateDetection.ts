import prisma from '@/lib/prisma';

const normalizeUsername = (value: string) => value.replace(/^@/, '').trim().toLocaleLowerCase('tr-TR');
const normalizeUrl = (value: string) => value.trim().toLocaleLowerCase('tr-TR').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
const normalizeName = (value: string) => value.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

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

export async function findDuplicateProfiles(input: { username?: string; name?: string; urls?: string[]; excludeId?: string | null }) {
  const username = normalizeUsername(input.username || '');
  const name = normalizeName(input.name || '');
  const urls = (input.urls || []).map(normalizeUrl).filter(Boolean);
  if (!username && !name && !urls.length) return [];
  const profiles = await prisma.profile.findMany({ where: input.excludeId ? { id: { not: input.excludeId } } : undefined, include: { platformLinks: { include: { platform: true } } }, orderBy: { updatedAt: 'desc' } });
  return profiles.flatMap((profile) => {
    const reasons: string[] = [];
    if (username && normalizeUsername(profile.username) === username) reasons.push('Same username');
    const profileUrls = profile.platformLinks.map((link) => normalizeUrl(link.url));
    if (urls.some((url) => profileUrls.includes(url))) reasons.push('Same profile URL');
    let score = 0;
    if (name.length >= 3) { score = 1 - levenshtein(name, normalizeName(profile.displayName)) / Math.max(name.length, normalizeName(profile.displayName).length); if (score >= 0.85) reasons.push(`Benzer isim (%${Math.round(score * 100)})`); }
    return reasons.length ? [{ id: profile.id, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl, deletedAt: profile.deletedAt?.toISOString() || null, reasons, similarity: score, platformLinks: profile.platformLinks.map((link) => ({ platformKey: link.platform.key, url: link.url })) }] : [];
  }).slice(0, 5);
}
