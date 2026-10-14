import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { cleanupDownloadedImages, downloadAndStoreImage } from '@/lib/remoteImage';

export class InstagramImportError extends Error {
  constructor(public readonly code: string, public readonly status = 422) {
    super(code);
  }
}

export function canonicalInstagramUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) throw new InstagramImportError('INVALID_INSTAGRAM_URL', 400);
  let url: URL;
  try { url = new URL(value); } catch { throw new InstagramImportError('INVALID_INSTAGRAM_URL', 400); }
  if (!['https:', 'http:'].includes(url.protocol) || !['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname)
    || url.username || url.password || url.port) throw new InstagramImportError('INVALID_INSTAGRAM_URL', 400);
  const parts = url.pathname.split('/').filter(Boolean);
  const isPost = parts.length === 2 && ['p', 'reel', 'reels', 'tv'].includes(parts[0]) && /^[\w-]+$/.test(parts[1]);
  const isProfile = parts.length === 1 && /^[a-zA-Z0-9._]{1,30}$/.test(parts[0])
    && !['accounts', 'direct', 'explore', 'stories', 'p', 'reel', 'reels', 'tv'].includes(parts[0].toLowerCase());
  if (!isPost && !isProfile) throw new InstagramImportError('INVALID_INSTAGRAM_URL', 400);
  if (parts[0] === 'reels' && isPost) parts[0] = 'reel';
  if (isProfile) parts[0] = parts[0].toLowerCase();
  return `https://www.instagram.com/${parts.join('/')}/`;
}

type ImportResult = { id: string; username: string; displayName: string; imagesAdded: number; outcome: 'created' | 'updated' | 'already_saved' };
type ScrapedProfile = { username: string; displayName: string; bio: string; isVerified: boolean; profileUrl: string; postImages: string[]; avatar: string | null; websites: string[] };
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function imageUrl(value: unknown) {
  if (!value) return null;
  if (typeof value !== 'string' || value.length > 8192) throw new InstagramImportError('INVALID_SCRAPER_RESPONSE');
  let url: URL;
  try { url = new URL(value); } catch { throw new InstagramImportError('INVALID_SCRAPER_RESPONSE'); }
  const allowed = ['cdninstagram.com', 'fbcdn.net', 'instagram.com'].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  if (url.protocol !== 'https:' || !allowed || url.username || url.password || url.port) throw new InstagramImportError('INVALID_SCRAPER_RESPONSE');
  return url.href;
}

function parseScrapedProfile(value: unknown, sourceUrl: string): ScrapedProfile {
  const payload = record(value);
  const owner = record(payload.owner_info);
  const post = record(payload.post_info);
  const username = text(owner.username, 100).replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) throw new InstagramImportError('INVALID_SCRAPER_RESPONSE');
  const profileUrl = `https://www.instagram.com/${username}/`;
  if (new URL(sourceUrl).pathname.split('/').filter(Boolean).length === 1 && profileUrl !== sourceUrl) throw new InstagramImportError('INVALID_SCRAPER_RESPONSE');
  if (post.post_url && canonicalInstagramUrl(post.post_url) !== sourceUrl) throw new InstagramImportError('INVALID_SCRAPER_RESPONSE');
  const rawImages = Array.isArray(post.image_urls) && post.image_urls.length ? post.image_urls : [post.full_res_image_url].filter(Boolean);
  if (rawImages.length > 20) throw new InstagramImportError('TOO_MANY_IMAGES');
  const postImages = [...new Set(rawImages.map(imageUrl).filter((url): url is string => Boolean(url)))];
  const websites: string[] = [];
  const links = Array.isArray(owner.links) ? owner.links : [];
  for (const value of [...links, owner.external_url]) {
    if (typeof value !== 'string' || value.length > 2048) continue;
    try {
      const url = new URL(value);
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !websites.includes(url.href)) websites.push(url.href);
    } catch { /* Ignore non-URL metadata. */ }
  }
  return { username, displayName: text(owner.full_name, 200) || username, bio: text(owner.biography, 5000),
    isVerified: owner.is_verified === true, profileUrl, postImages, avatar: imageUrl(owner.profile_pic_url), websites: websites.slice(0, 10) };
}

async function scrape(sourceUrl: string) {
  const configuredUrl = process.env.INSTAGRAM_SCRAPER_URL;
  if (!configuredUrl) throw new InstagramImportError('SCRAPER_NOT_CONFIGURED', 503);
  let endpoint: URL;
  try { endpoint = new URL(configuredUrl); } catch { throw new InstagramImportError('SCRAPER_NOT_CONFIGURED', 503); }
  if (!['http:', 'https:'].includes(endpoint.protocol)) throw new InstagramImportError('SCRAPER_NOT_CONFIGURED', 503);
  endpoint.searchParams.set('url', sourceUrl);
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(120_000), redirect: 'error', cache: 'no-store' });
    if (!response.ok || !response.body) throw new InstagramImportError('SCRAPER_FAILED', 502);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); throw new InstagramImportError('INVALID_SCRAPER_RESPONSE'); }
      chunks.push(value);
    }
    return parseScrapedProfile(JSON.parse(Buffer.concat(chunks).toString('utf8')), sourceUrl);
  } catch (error) {
    if (error instanceof InstagramImportError) throw error;
    throw new InstagramImportError('SCRAPER_FAILED', 502);
  }
}

async function previousImport(client: Prisma.TransactionClient, importId: string): Promise<ImportResult | null> {
  const log = await client.activityLog.findUnique({ where: { id: importId }, include: { profile: true } });
  if (!log) return null;
  if (log.profile.deletedAt) throw new InstagramImportError('PROFILE_IN_TRASH', 409);
  return { id: log.profileId, username: log.profile.username, displayName: log.profile.displayName, imagesAdded: 0, outcome: 'already_saved' };
}

async function findOwner(client: Prisma.TransactionClient, data: ScrapedProfile) {
  const candidates = await client.profile.findMany({ where: { platformLinks: { some: { platform: { key: 'instagram' } } } },
    include: { platformLinks: { include: { platform: true } }, images: { orderBy: { sortOrder: 'asc' } } } });
  const matches = candidates.filter((profile) => profile.platformLinks.some((link) => {
    if (link.platform.key !== 'instagram') return false;
    try { return canonicalInstagramUrl(link.url) === data.profileUrl; } catch { return false; }
  }));
  if (matches.length > 1) throw new InstagramImportError('AMBIGUOUS_PROFILE', 409);
  if (matches[0]?.deletedAt) throw new InstagramImportError('PROFILE_IN_TRASH', 409);
  return matches[0] ?? null;
}

export async function importInstagramUrl(input: unknown): Promise<ImportResult> {
  const sourceUrl = canonicalInstagramUrl(input);
  // The deterministic activity ID survives restarts and JSON/ZIP exports.
  const importId = `instagram_import_${createHash('sha256').update(sourceUrl).digest('hex')}`;
  const previous = await previousImport(prisma, importId);
  if (previous) return previous;
  const data = await scrape(sourceUrl);
  const existing = await findOwner(prisma, data);
  const sourceImages = [...new Set([...data.postImages, ...(!existing && data.avatar ? [data.avatar] : [])])];
  if (!sourceImages.length) {
    if (existing) return { id: existing.id, username: existing.username, displayName: existing.displayName, imagesAdded: 0, outcome: 'already_saved' };
    throw new InstagramImportError('NO_IMAGES');
  }
  const storedUrls: string[] = [];
  let committed = false;
  try {
    for (const image of sourceImages) storedUrls.push(await downloadAndStoreImage(image));
    const result = await prisma.$transaction(async (tx) => {
      const previous = await previousImport(tx, importId);
      if (previous) return previous;
      const existing = await findOwner(tx, data);
      const instagram = await tx.platform.findUnique({ where: { key: 'instagram' } });
      if (!instagram) throw new InstagramImportError('INSTAGRAM_PLATFORM_MISSING', 503);
      if (existing) {
        const start = Math.max(-1, ...existing.images.map((image) => image.sortOrder)) + 1;
        const hasCover = existing.images.some((image) => image.isCover);
        await tx.profile.update({ where: { id: existing.id }, data: {
          images: { create: storedUrls.map((url, index) => ({ url, sortOrder: start + index, isCover: !hasCover && index === 0 })) },
          ...(!hasCover ? { avatarUrl: storedUrls[0] } : {}),
          activityLogs: { create: { id: importId, action: 'EDITED', detail: sourceUrl } },
        } });
        return { id: existing.id, username: existing.username, displayName: existing.displayName, imagesAdded: storedUrls.length, outcome: 'updated' as const };
      }
      const website = await tx.platform.findUnique({ where: { key: 'website' } });
      const profile = await tx.profile.create({ data: {
        username: data.username, displayName: data.displayName, bio: data.bio || null, isVerified: data.isVerified, avatarUrl: storedUrls[0],
        images: { create: storedUrls.map((url, index) => ({ url, sortOrder: index, isCover: index === 0 })) },
        platformLinks: { create: [{ platformId: instagram.id, url: data.profileUrl },
          ...(website ? data.websites.map((url) => ({ platformId: website.id, url })) : [])] },
        activityLogs: { create: { id: importId, action: 'CREATED', detail: sourceUrl } },
      } });
      return { id: profile.id, username: profile.username, displayName: profile.displayName, imagesAdded: storedUrls.length, outcome: 'created' as const };
    }, { timeout: 10_000 });
    // Set only after the transaction actually commits, including failures on COMMIT.
    committed = result.outcome !== 'already_saved';
    return result;
  } catch (error) {
    committed = false;
    throw error;
  } finally {
    if (!committed) await cleanupDownloadedImages(storedUrls);
  }
}
