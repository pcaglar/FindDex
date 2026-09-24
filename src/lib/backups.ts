import fs from 'node:fs/promises';
import path from 'node:path';
import { createExportSnapshot } from '@/lib/transfer';
import { getAppSettings } from '@/lib/appSettings';

export const backupsDirectory = () => process.env.BACKUPS_DIR || path.join(process.cwd(), 'data', 'backups');
export async function listBackups() {
  await fs.mkdir(backupsDirectory(), { recursive: true });
  const names = (await fs.readdir(backupsDirectory())).filter((name) => /^(?:finddex|modelvault)-backup-.*\.json$/.test(name));
  const rows = await Promise.all(names.map(async (name) => { const stat = await fs.stat(path.join(backupsDirectory(), name)); return { name, size: stat.size, createdAt: stat.mtime.toISOString() }; }));
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function createBackup() {
  await fs.mkdir(backupsDirectory(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `finddex-backup-${stamp}.json`;
  await fs.writeFile(path.join(backupsDirectory(), name), JSON.stringify(await createExportSnapshot(), null, 2), 'utf8');
  const settings = await getAppSettings();
  const files = await listBackups();
  await Promise.all(files.slice(settings.backupRetention).map((item) => fs.unlink(path.join(backupsDirectory(), item.name))));
  return { name, files: await listBackups() };
}
