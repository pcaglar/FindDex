import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
async function directoryStats(directory: string): Promise<{ count: number; bytes: number }> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    let count = 0, bytes = 0;
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) { const nested = await directoryStats(full); count += nested.count; bytes += nested.bytes; }
      else if (entry.isFile() && entry.name !== '.gitkeep') { count += 1; bytes += (await fs.stat(full)).size; }
    }
    return { count, bytes };
  } catch (error: any) { if (error?.code === 'ENOENT') return { count: 0, bytes: 0 }; throw error; }
}

export async function GET() {
  try {
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
    const databaseUrl = process.env.DATABASE_URL || 'file:/app/data/dev.db';
    const dbPath = databaseUrl.replace(/^file:/, '');
    const [profiles, activeProfiles, trashProfiles, images, tags, collections, uploads, database] = await Promise.all([
      prisma.profile.count(), prisma.profile.count({ where: { deletedAt: null } }), prisma.profile.count({ where: { deletedAt: { not: null } } }), prisma.profileImage.count(), prisma.tag.count(), prisma.collection.count(), directoryStats(uploadsDir),
      fs.stat(dbPath).catch(() => null),
    ]);
    return NextResponse.json({ success: true, data: { profiles, activeProfiles, trashProfiles, images, tags, collections, uploadFiles: uploads.count, uploadsBytes: uploads.bytes, databaseBytes: database?.size || 0 } });
  } catch (error) {
    console.error('Storage stats failed:', error);
    return NextResponse.json({ success: false, error: 'Storage information could not be loaded' }, { status: 500 });
  }
}
