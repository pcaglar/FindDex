import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { assertValidSnapshot, importSnapshot } from '@/lib/transfer';

export const dynamic = 'force-dynamic';
const uploadsDirectory = path.join(process.cwd(), 'public', 'uploads');

async function replaceUploads(files: { name: string; data: Uint8Array }[]) {
  await fs.mkdir(uploadsDirectory, { recursive: true });
  for (const entry of await fs.readdir(uploadsDirectory, { withFileTypes: true })) {
    if (entry.name !== '.gitkeep') {
      await fs.rm(path.join(uploadsDirectory, entry.name), { recursive: true, force: true });
    }
  }
  await writeUploads(files);
}

async function writeUploads(files: { name: string; data: Uint8Array }[]) {
  await fs.mkdir(uploadsDirectory, { recursive: true });
  for (const file of files) {
    const safeName = path.basename(file.name);
    if (!safeName || safeName === '.gitkeep') continue;
    await fs.writeFile(path.join(uploadsDirectory, safeName), file.data);
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const mode = form.get('mode') === 'replace' ? 'replace' : 'merge';
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file was selected' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let snapshot: any;
    const uploads: { name: string; data: Uint8Array }[] = [];
    const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';

    if (isZip) {
      const zip = await JSZip.loadAsync(bytes);
      const entries = Object.values(zip.files);
      const jsonEntry = entries.find((entry) => {
        const name = path.basename(entry.name).toLowerCase();
        return !entry.dir && (name.startsWith('finddex-export-') || name.startsWith('modelvault-export-')) && name.endsWith('.json');
      })
        || entries.find((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.json'));
      if (!jsonEntry) throw new Error('No FindDex JSON file was found in the ZIP archive.');
      snapshot = JSON.parse(await jsonEntry.async('string'));
      for (const entry of Object.values(zip.files)) {
        if (!entry.dir && entry.name.startsWith('uploads/')) {
          uploads.push({ name: entry.name.slice('uploads/'.length), data: await entry.async('uint8array') });
        }
      }
    } else {
      snapshot = JSON.parse(new TextDecoder().decode(bytes));
    }

    assertValidSnapshot(snapshot);
    const result = await importSnapshot(snapshot, mode);
    if (isZip) {
      if (mode === 'replace') await replaceUploads(uploads);
      else await writeUploads(uploads);
    }

    return NextResponse.json({ success: true, data: { ...result, uploads: uploads.length } });
  } catch (error: any) {
    console.error('Import failed:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Import failed' }, { status: 400 });
  }
}
