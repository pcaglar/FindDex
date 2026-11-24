import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { assertValidSnapshot, importSnapshot } from '@/lib/transfer';
import { backupsDirectory, createBackup } from '@/lib/backups';
import { safeUploadPath, uploadsDirectory } from '@/lib/uploadStorage';

export const dynamic = 'force-dynamic';

type UploadFile = { name: string; data: Uint8Array };

// Copy (never move) the current uploads aside so a replace import can be rolled back by hand.
async function copyUploadsToSafety(stamp: string) {
  const entries = await fs.readdir(uploadsDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile() && entry.name !== '.gitkeep');
  if (!files.length) return null;
  const target = path.join(backupsDirectory(), `uploads-before-import-${stamp}`);
  await fs.mkdir(target, { recursive: true });
  for (const entry of files) await fs.copyFile(path.join(uploadsDirectory, entry.name), path.join(target, entry.name));
  return path.basename(target);
}

async function clearUploads() {
  for (const entry of await fs.readdir(uploadsDirectory, { withFileTypes: true }).catch(() => [])) {
    if (entry.name !== '.gitkeep') await fs.rm(path.join(uploadsDirectory, entry.name), { recursive: true, force: true });
  }
}

async function writeUploads(files: UploadFile[]) {
  await fs.mkdir(uploadsDirectory, { recursive: true });
  for (const file of files) {
    // Only plain, safe file names are written; anything else in the archive is ignored.
    const target = safeUploadPath(file.name);
    if (target) await fs.writeFile(target, file.data);
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
    const uploads: UploadFile[] = [];
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

    // Replace mode is destructive: save a JSON copy of the database (and the current
    // upload files) first, so the previous state can be restored by hand.
    let safetyBackup: string | null = null;
    let safetyUploads: string | null = null;
    if (mode === 'replace') {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      safetyBackup = (await createBackup({ prune: false })).name;
      if (isZip && uploads.length) safetyUploads = await copyUploadsToSafety(stamp);
    }

    const result = await importSnapshot(snapshot, mode);
    if (isZip) {
      // A ZIP without images must not wipe the images existing records still point to.
      if (mode === 'replace' && uploads.length) await clearUploads();
      await writeUploads(uploads);
    }

    return NextResponse.json({ success: true, data: { ...result, uploads: uploads.length, safetyBackup, safetyUploads } });
  } catch (error: any) {
    console.error('Import failed:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Import failed' }, { status: 400 });
  }
}
