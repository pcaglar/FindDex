import { NextResponse } from 'next/server';
import { createBackup, listBackups } from '@/lib/backups';
import { getAppSettings } from '@/lib/appSettings';

export const dynamic = 'force-dynamic';
export async function GET() {
  const [files, settings] = await Promise.all([listBackups(), getAppSettings()]);
  return NextResponse.json({ success: true, data: { files, lastBackupAt: files[0]?.createdAt || null, enabled: settings.automaticBackupEnabled } });
}
export async function POST() {
  try { return NextResponse.json({ success: true, data: await createBackup() }); }
  catch (error) { console.error('Backup failed:', error); return NextResponse.json({ success: false, error: 'Backup could not be created' }, { status: 500 }); }
}
