import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { safeUploadPath, uploadContentType } from '@/lib/uploadStorage';

export const dynamic = 'force-dynamic';

async function resolveUpload(filename: string, includeBody: boolean) {
  const filePath = safeUploadPath(filename);
  const contentType = uploadContentType(filename);
  if (!filePath || !contentType) {
    return NextResponse.json({ success: false, error: 'Invalid file name' }, { status: 400 });
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
    const headers = {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    };
    if (!includeBody) return new NextResponse(null, { status: 200, headers });
    const file = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(file), { status: 200, headers });
  } catch {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }
}

export async function GET(_request: Request, { params }: { params: { filename: string } }) {
  return resolveUpload(params.filename, true);
}

export async function HEAD(_request: Request, { params }: { params: { filename: string } }) {
  return resolveUpload(params.filename, false);
}
