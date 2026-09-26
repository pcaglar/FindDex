import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { safeUploadPath, uploadsDirectory } from '@/lib/uploadStorage';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageStorageErrorCode =
  | 'INVALID_IMAGE_URL'
  | 'IMAGE_DOWNLOAD_TIMEOUT'
  | 'IMAGE_DOWNLOAD_FAILED'
  | 'IMAGE_TOO_LARGE'
  | 'UNSUPPORTED_IMAGE';

export class ImageStorageError extends Error {
  constructor(
    public readonly code: ImageStorageErrorCode,
    message: string,
    public readonly status = 422,
  ) {
    super(message);
    this.name = 'ImageStorageError';
  }
}

type SupportedImage = { extension: '.jpg' | '.png' | '.webp'; mimeType: string };

const SUPPORTED_MIME_TYPES: Record<string, SupportedImage> = {
  'image/jpeg': { extension: '.jpg', mimeType: 'image/jpeg' },
  'image/jpg': { extension: '.jpg', mimeType: 'image/jpeg' },
  'image/png': { extension: '.png', mimeType: 'image/png' },
  'image/webp': { extension: '.webp', mimeType: 'image/webp' },
};

export function isSupportedImageMimeType(value: string) {
  return Boolean(SUPPORTED_MIME_TYPES[value.split(';')[0].trim().toLowerCase()]);
}

function detectImage(buffer: Buffer): SupportedImage | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return SUPPORTED_MIME_TYPES['image/jpeg'];
  }
  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return SUPPORTED_MIME_TYPES['image/png'];
  }
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return SUPPORTED_MIME_TYPES['image/webp'];
  }
  return null;
}

export async function storeImageBuffer(buffer: Buffer, declaredMimeType?: string) {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ImageStorageError('IMAGE_TOO_LARGE', 'The image exceeds the 5 MB limit.');
  }

  const declaredType = declaredMimeType?.split(';')[0].trim().toLowerCase();
  if (declaredType && !SUPPORTED_MIME_TYPES[declaredType]) {
    throw new ImageStorageError('UNSUPPORTED_IMAGE', 'Only JPG, PNG, and WEBP images are supported.');
  }

  const detected = detectImage(buffer);
  if (!detected) {
    throw new ImageStorageError('UNSUPPORTED_IMAGE', 'Only JPG, PNG, and WEBP images are supported.');
  }

  await fs.mkdir(uploadsDirectory, { recursive: true });
  const filename = `fd_${randomUUID()}${detected.extension}`;
  await fs.writeFile(path.join(uploadsDirectory, filename), buffer, { flag: 'wx' });

  return { url: `/api/uploads/${filename}`, filename, mimeType: detected.mimeType };
}

export async function deleteStoredImage(url: string) {
  const filename = url.startsWith('/api/uploads/')
    ? url.slice('/api/uploads/'.length)
    : url.startsWith('/uploads/')
      ? url.slice('/uploads/'.length)
      : '';
  if (!filename) return;
  const target = safeUploadPath(filename);
  if (!target) return;
  await fs.unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
