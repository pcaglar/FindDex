import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import packageInfo from '../../../../../package.json';

export const dynamic = 'force-dynamic';
export async function GET() {
  let latestMigration: { name: string; date: string | null } | null = null;
  try {
    const directory = path.join(process.cwd(), 'prisma', 'migrations');
    const names = (await fs.readdir(directory, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse();
    if (names[0]) {
      const stat = await fs.stat(path.join(directory, names[0], 'migration.sql'));
      latestMigration = { name: names[0], date: stat.mtime.toISOString() };
    }
  } catch { /* no migrations */ }
  return NextResponse.json({ success: true, data: { version: packageInfo.version, nodeVersion: process.version, latestMigration } });
}
