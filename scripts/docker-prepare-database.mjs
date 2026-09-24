import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const initialMigration = '20260923000000_init';
const applicationTables = [
  'Profile',
  'Platform',
  'PlatformLink',
  'Tag',
  'ProfileTag',
  'Collection',
  'ProfileCollection',
];

const prisma = new PrismaClient();
let shouldBaseline = false;

try {
  const [{ journal_mode: journalMode } = {}] = await prisma.$queryRawUnsafe(
    'PRAGMA journal_mode = WAL'
  );
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 30000');
  console.log(`SQLite journal mode: ${journalMode || 'unknown'}; busy timeout: 30s.`);

  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table'"
  );
  const tableNames = new Set(tables.map(({ name }) => name));
  const hasMigrationHistory = tableNames.has('_prisma_migrations');
  const hasCompleteLegacySchema = applicationTables.every((table) => tableNames.has(table));

  shouldBaseline = !hasMigrationHistory && hasCompleteLegacySchema;
} finally {
  await prisma.$disconnect();
}

if (shouldBaseline) {
  console.log('Existing FindDex database detected; recording the initial migration baseline.');
  const result = spawnSync(
    './node_modules/.bin/prisma',
    ['migrate', 'resolve', '--applied', initialMigration],
    { cwd: '/app', env: process.env, stdio: 'inherit' }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
