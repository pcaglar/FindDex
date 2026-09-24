import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { uploadsDirectory } from '@/lib/uploadStorage';

export async function downloadRemoteImage(url: string) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('The image URL must use HTTP or HTTPS.');
  const response = await fetch(parsed, { headers: { 'User-Agent': 'Mozilla/5.0 FindDex/1.0', Accept: 'image/*' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`The image could not be downloaded (${response.status}).`);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const extensions: Record<string, string> = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  const extension = extensions[contentType];
  if (!extension) throw new Error('The Instagram image format is not supported.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) throw new Error('The image exceeds the 5 MB limit.');
  await fs.mkdir(uploadsDirectory, { recursive: true });
  const filename = `mv_ext_${Date.now()}_${randomBytes(4).toString('hex')}${extension}`;
  await fs.writeFile(path.join(uploadsDirectory, filename), bytes);
  return `/api/uploads/${filename}`;
}
