import {
  deleteStoredImage,
  ImageStorageError,
  isSupportedImageMimeType,
  MAX_IMAGE_BYTES,
  storeImageBuffer,
} from '@/lib/imageStorage';

async function readImageBody(response: Response) {
  if (!response.body) {
    throw new ImageStorageError('IMAGE_DOWNLOAD_FAILED', 'The image response was empty.');
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new ImageStorageError('IMAGE_TOO_LARGE', 'The image exceeds the 5 MB limit.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes);
}

export async function downloadAndStoreImage(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImageStorageError('INVALID_IMAGE_URL', 'Enter a valid HTTP or HTTPS image URL.', 400);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ImageStorageError('INVALID_IMAGE_URL', 'Enter a valid HTTP or HTTPS image URL.', 400);
  }

  try {
    const response = await fetch(parsed, {
      headers: { 'User-Agent': 'Mozilla/5.0 FindDex/1.0', Accept: 'image/jpeg,image/png,image/webp' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new ImageStorageError('IMAGE_DOWNLOAD_FAILED', `The image could not be downloaded (${response.status}).`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      throw new ImageStorageError('IMAGE_TOO_LARGE', 'The image exceeds the 5 MB limit.');
    }

    const contentType = response.headers.get('content-type') || '';
    if (!isSupportedImageMimeType(contentType)) {
      throw new ImageStorageError('UNSUPPORTED_IMAGE', 'Only JPG, PNG, and WEBP images are supported.');
    }

    const stored = await storeImageBuffer(await readImageBody(response), contentType);
    return stored.url;
  } catch (error) {
    if (error instanceof ImageStorageError) throw error;
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new ImageStorageError('IMAGE_DOWNLOAD_TIMEOUT', 'The image download timed out. Please try again.');
    }
    throw new ImageStorageError('IMAGE_DOWNLOAD_FAILED', 'The image could not be downloaded. Check the URL and try again.');
  }
}

export const downloadRemoteImage = downloadAndStoreImage;

type ProfileImageInput = { url?: unknown; [key: string]: unknown };

export async function localizeRemoteProfileImages<T extends Record<string, unknown>>(input: T) {
  const downloads = new Map<string, Promise<string>>();
  const storedUrls: string[] = [];

  const localize = async (value: unknown) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!/^https?:\/\//i.test(url)) return url;
    if (!downloads.has(url)) {
      downloads.set(url, downloadAndStoreImage(url).then((storedUrl) => {
        storedUrls.push(storedUrl);
        return storedUrl;
      }));
    }
    return downloads.get(url)!;
  };

  try {
    const localized: Record<string, unknown> = { ...input };
    if (Array.isArray(input.images)) {
      const images: ProfileImageInput[] = [];
      for (const image of input.images as ProfileImageInput[]) {
        images.push({ ...image, url: await localize(image.url) });
      }
      localized.images = images;
    }
    if ('avatarUrl' in input) localized.avatarUrl = await localize(input.avatarUrl);
    if ('coverUrl' in input) localized.coverUrl = await localize(input.coverUrl);

    return { data: localized as T, storedUrls };
  } catch (error) {
    await Promise.allSettled(storedUrls.map(deleteStoredImage));
    throw error;
  }
}

export async function cleanupDownloadedImages(urls: string[]) {
  await Promise.allSettled(urls.map(deleteStoredImage));
}
