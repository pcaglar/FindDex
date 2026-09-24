import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { createExportSnapshot } from '@/lib/transfer';

export const dynamic = 'force-dynamic';

async function addDirectoryToZip(zip: JSZip, directory: string, prefix: string) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.gitkeep') continue;
      const fullPath = path.join(directory, entry.name);
      const zipPath = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await addDirectoryToZip(zip, fullPath, zipPath);
      if (entry.isFile()) zip.file(zipPath, await fs.readFile(fullPath));
    }
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const snapshot = await createExportSnapshot();
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: process.env.TZ || 'Europe/Istanbul',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const json = JSON.stringify(snapshot, null, 2);
    const wantsZip = request.nextUrl.searchParams.get('format') === 'zip';

    if (!wantsZip) {
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="finddex-export-${date}.json"`,
        },
      });
    }

    const zip = new JSZip();
    zip.file(`finddex-export-${date}.json`, json);
    await addDirectoryToZip(zip, path.join(process.cwd(), 'public', 'uploads'), 'uploads');
    const archive = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    return new NextResponse(archive.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="finddex-export-${date}.zip"`,
      },
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 });
  }
}
