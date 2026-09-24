import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '@/lib/prisma';
import { safeUploadPath, uploadsDirectory } from '@/lib/uploadStorage';

export async function GET() {
  try {
    await fs.mkdir(uploadsDirectory, { recursive: true });
    const [entries, images] = await Promise.all([fs.readdir(uploadsDirectory, { withFileTypes: true }), prisma.profileImage.findMany({ select: { url: true } })]);
    const referenced = new Set(images.map((item) => path.basename(item.url.split('?')[0])));
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile() || entry.name === '.gitkeep' || referenced.has(entry.name)) continue;
      files.push({ name: entry.name, size: (await fs.stat(path.join(uploadsDirectory, entry.name))).size });
    }
    return NextResponse.json({ success: true, data: files });
  } catch (error) { console.error('Orphan scan failed:', error); return NextResponse.json({ success: false, error: 'The disk could not be scanned' }, { status: 500 }); }
}
export async function DELETE(request: NextRequest) {
  try {
    const filenames = (await request.json()).filenames;
    let deleted = 0;
    for (const filename of Array.isArray(filenames) ? filenames : []) {
      if (typeof filename !== 'string') continue;
      const target = safeUploadPath(filename);
      if (!target) continue;
      const referenced = await prisma.profileImage.count({ where: { url: { contains: filename } } });
      if (referenced === 0) { await fs.unlink(target).catch((error: any) => { if (error?.code !== 'ENOENT') throw error; }); deleted += 1; }
    }
    return NextResponse.json({ success: true, data: { deleted } });
  } catch { return NextResponse.json({ success: false, error: 'Dosyalar silinemedi' }, { status: 500 }); }
}
