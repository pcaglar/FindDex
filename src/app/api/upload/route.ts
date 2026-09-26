import { NextRequest, NextResponse } from 'next/server';
import { ImageStorageError, storeImageBuffer } from '@/lib/imageStorage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file was provided' }, { status: 400 });
    }

    const stored = await storeImageBuffer(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({
      success: true,
      url: stored.url,
      filename: stored.filename,
    });
  } catch (error) {
    console.error('File upload error:', error);
    if (error instanceof ImageStorageError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: 'An error occurred while uploading the image' },
      { status: 500 }
    );
  }
}
