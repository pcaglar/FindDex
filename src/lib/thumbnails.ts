import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { uploadsDirectory } from '@/lib/uploadStorage';

// Thumbnails are derived files: generated on first request, cached under UPLOADS_DIR/.thumbs and
// safe to delete at any time. The original upload is never modified. Nothing is stored in the database.
export const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_QUALITY = 78;
// Originals this small are served as-is; a thumbnail would not be meaningfully smaller.
const SMALL_ORIGINAL_BYTES = 120 * 1024;
export const thumbnailsDirectory = () => path.join(uploadsDirectory, '.thumbs');

export type ThumbnailResult = { filePath: string; contentType: string };

const inFlight = new Map<string, Promise<ThumbnailResult | null>>();

const thumbnailPath = (filename: string) => path.join(thumbnailsDirectory(), `${path.parse(filename).name}.webp`);

async function createThumbnail(originalPath: string, target: string): Promise<ThumbnailResult | null> {
  const stat = await fs.stat(originalPath);
  const metadata = await sharp(originalPath).metadata();
  if ((metadata.width ?? 0) <= THUMBNAIL_WIDTH && stat.size <= SMALL_ORIGINAL_BYTES) return null;
  await fs.mkdir(thumbnailsDirectory(), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    await sharp(originalPath)
      .rotate() // honour EXIF orientation, which the resize would otherwise drop
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toFile(temporary);
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.unlink(temporary).catch(() => undefined);
    throw error;
  }
  return { filePath: target, contentType: 'image/webp' };
}

/**
 * Returns the cached/generated thumbnail for an upload, or null when the original should be served
 * (already small, unreadable, or thumbnailing failed). Never throws.
 */
export async function getThumbnail(filename: string, originalPath: string): Promise<ThumbnailResult | null> {
  const target = thumbnailPath(filename);
  try {
    const [original, cached] = await Promise.all([fs.stat(originalPath), fs.stat(target).catch(() => null)]);
    if (cached && cached.mtimeMs >= original.mtimeMs) return { filePath: target, contentType: 'image/webp' };
  } catch {
    return null;
  }
  const pending = inFlight.get(target) ?? createThumbnail(originalPath, target).catch((error) => {
    console.warn('Thumbnail could not be generated; serving the original', error instanceof Error ? error.message : error);
    return null;
  }).finally(() => inFlight.delete(target));
  inFlight.set(target, pending);
  return pending;
}

export async function removeThumbnail(filename: string) {
  await fs.unlink(thumbnailPath(filename)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') console.warn('Thumbnail could not be removed', error.message);
  });
}
