import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { safeUploadPath, uploadContentType } from '@/lib/uploadStorage';
import { getThumbnail } from '@/lib/thumbnails';

export const dynamic = 'force-dynamic';

async function resolveUpload(filename: string, includeBody: boolean, wantsThumbnail = false) {
  const filePath = safeUploadPath(filename);
  const contentType = uploadContentType(filename);
  if (!filePath || !contentType) {
    return NextResponse.json({ success: false, error: 'Invalid file name' }, { status: 400 });
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
    // ?thumb=1 serves a small WebP preview when one is worthwhile; otherwise the original.
    const thumbnail = wantsThumbnail ? await getThumbnail(filename, filePath) : null;
    const servedPath = thumbnail?.filePath ?? filePath;
    const servedStat = thumbnail ? await fs.stat(servedPath) : stat;
    const headers = {
      'Content-Type': thumbnail?.contentType ?? contentType,
      'Content-Length': String(servedStat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    };
    if (!includeBody) return new NextResponse(null, { status: 200, headers });
    const file = await fs.readFile(servedPath);
    return new NextResponse(new Uint8Array(file), { status: 200, headers });
  } catch {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }
}

const wantsThumbnail = (request: Request) => new URL(request.url).searchParams.get('thumb') === '1';

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  return resolveUpload(params.filename, true, wantsThumbnail(request));
}

export async function HEAD(request: Request, { params }: { params: { filename: string } }) {
  return resolveUpload(params.filename, false, wantsThumbnail(request));
}
