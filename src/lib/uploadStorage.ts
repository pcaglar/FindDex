import path from 'path';

export const uploadsDirectory = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');

export function safeUploadPath(filename: string) {
  const safeName = path.basename(filename);
  if (safeName !== filename || !/^[a-zA-Z0-9._-]+$/.test(safeName)) return null;
  return path.join(uploadsDirectory, safeName);
}

export function uploadContentType(filename: string) {
  switch (path.extname(filename).toLowerCase()) {
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    default: return null;
  }
}
