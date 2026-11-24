// Grid and list views show a small thumbnail; the full-size original is loaded only when the
// image is opened. Thumbnails are generated on demand by /api/uploads/<file>?thumb=1.
const LOCAL_PREFIXES = ['/api/uploads/', '/uploads/'];

export function isLocalUpload(url: string) {
  return LOCAL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function thumbnailUrl(url: string) {
  if (!url || url.includes('?')) return url;
  const prefix = LOCAL_PREFIXES.find((candidate) => url.startsWith(candidate));
  if (!prefix) return url;
  return `/api/uploads/${url.slice(prefix.length)}?thumb=1`;
}
