import { NextRequest, NextResponse } from 'next/server';
import { authenticateExternalRequest } from '@/lib/externalApi';
import { ImageStorageError } from '@/lib/imageStorage';
import { importInstagramUrl, InstagramImportError } from '@/lib/instagramImport';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!await authenticateExternalRequest(request)) return NextResponse.json({ success: false, code: 'UNAUTHORIZED' }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, code: 'INVALID_INSTAGRAM_URL' }, { status: 400 }); }
    const url = body && typeof body === 'object' && 'url' in body ? body.url : undefined;
    const data = await importInstagramUrl(url);
    return NextResponse.json({ success: true, data }, { status: data.outcome === 'created' ? 201 : 200 });
  } catch (error) {
    if (error instanceof InstagramImportError || error instanceof ImageStorageError) {
      return NextResponse.json({ success: false, code: error.code }, { status: error.status });
    }
    // Never log request bodies, signed image URLs or API credentials.
    console.error('[instagram-import] Import failed.');
    return NextResponse.json({ success: false, code: 'IMPORT_FAILED' }, { status: 500 });
  }
}
