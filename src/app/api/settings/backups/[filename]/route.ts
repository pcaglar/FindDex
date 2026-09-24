import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { backupsDirectory } from '@/lib/backups';

export async function GET(_request: NextRequest, { params }: { params: { filename: string } }) {
  const filename = path.basename(params.filename);
  if (!/^(?:finddex|modelvault)-backup-.*\.json$/.test(filename)) return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  try {
    return new NextResponse(await fs.readFile(path.join(backupsDirectory(), filename)), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${filename}"` } });
  } catch { return NextResponse.json({ error: 'Backup not found' }, { status: 404 }); }
}
