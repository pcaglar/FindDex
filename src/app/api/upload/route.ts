import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { uploadsDirectory } from '@/lib/uploadStorage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file was provided' }, { status: 400 });
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'The file exceeds the 5 MB limit' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Only JPG, PNG, and WEBP formats are supported' },
        { status: 400 }
      );
    }

    // Ensure public/uploads exists
    const uploadsDir = uploadsDirectory;
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique safe filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || (file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `mv_${Date.now()}_${randomSuffix}${ext}`;
    const destination = path.join(uploadsDir, filename);

    fs.writeFileSync(destination, buffer);

    const publicUrl = `/api/uploads/${filename}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while uploading the image' },
      { status: 500 }
    );
  }
}
