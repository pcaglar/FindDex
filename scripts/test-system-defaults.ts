import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// All database and upload changes stay in a disposable directory.
async function main() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'finddex-defaults-test-'));
  process.env.DATABASE_URL = `file:${path.join(directory, 'dev.db')}`;
  process.env.UPLOADS_DIR = path.join(directory, 'uploads');
  process.env.BACKUPS_DIR = path.join(directory, 'backups');
  const prismaCli = path.resolve('node_modules/prisma/build/index.js');
  const runPrisma = (...args: string[]) => execFileSync(process.execPath, [prismaCli, ...args], {
    env: process.env,
    stdio: 'pipe',
  });
  let disconnect: (() => Promise<void>) | undefined;

  try {
    execFileSync(process.execPath, [path.resolve('scripts/docker-prepare-database.mjs')], {
      env: process.env,
      stdio: 'pipe',
    });
    runPrisma('migrate', 'deploy');
    const { prisma } = await import('../src/lib/prisma');
    disconnect = () => prisma.$disconnect();
    const { clearVaultData } = await import('../src/lib/vaultMaintenance');
    const { ensureSystemDefaults, SYSTEM_COLLECTION_NAMES, SYSTEM_PLATFORMS } = await import('../prisma/systemDefaults');
    const defaults = async () => ({
      platforms: await prisma.platform.findMany({ where: { key: { in: SYSTEM_PLATFORMS.map((item) => item.key) } }, orderBy: { key: 'asc' } }),
      collections: await prisma.collection.findMany({ where: { name: { in: [...SYSTEM_COLLECTION_NAMES] } }, orderBy: { name: 'asc' } }),
    });

    assert.equal(await prisma.profile.count(), 0);
    assert.equal(await prisma.platform.count(), 5);
    assert.equal(await prisma.collection.count(), 2);
    const initial = await defaults();
    assert.deepEqual(initial.platforms.map((item) => item.key), ['instagram', 'tiktok', 'twitter', 'website', 'youtube']);
    assert.deepEqual(initial.collections.map((item) => item.name), [...SYSTEM_COLLECTION_NAMES]);
    await prisma.$transaction((tx) => ensureSystemDefaults(tx));
    await prisma.$transaction((tx) => ensureSystemDefaults(tx));
    assert.deepEqual(await defaults(), initial);
    console.log('PASS: empty database migrations create defaults; repeated upsert preserves IDs and metadata');

    const instagram = await prisma.platform.update({
      where: { key: 'instagram' }, data: { name: 'Saved platform metadata', color: '#123456' },
    });
    const customPlatform = await prisma.platform.create({ data: { key: 'test_custom', name: 'Test', icon: 'website', color: '#000000', isCustom: true } });
    const customCollection = await prisma.collection.create({ data: { name: 'Test collection' } });
    const tag = await prisma.tag.create({ data: { name: 'Test tag' } });
    await mkdir(process.env.UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(process.env.UPLOADS_DIR, 'reset-test.png'), 'disposable test upload');
    await prisma.profile.create({ data: {
      username: 'defaults_test', displayName: 'Test profile', avatarUrl: '/api/uploads/reset-test.png',
      platformLinks: { create: { platformId: instagram.id, url: 'https://example.com/test' } },
      tags: { create: { tagId: tag.id } },
      collections: { create: [{ collectionId: initial.collections[0].id }, { collectionId: customCollection.id }] },
      images: { create: { url: '/api/uploads/reset-test.png', isCover: true } },
    } });
    const snapshot = async () => ({
      platforms: await prisma.platform.findMany({ orderBy: { id: 'asc' } }),
      collections: await prisma.collection.findMany({ orderBy: { id: 'asc' } }),
      profiles: await prisma.profile.findMany({ include: { platformLinks: true, tags: true, collections: true, images: true } }),
    });
    const before = await snapshot();
    const migration = path.resolve('prisma/migrations/20261008000000_system_defaults/migration.sql');
    runPrisma('db', 'execute', '--file', migration, '--schema', 'prisma/schema.prisma');
    runPrisma('db', 'execute', '--file', migration, '--schema', 'prisma/schema.prisma');
    await prisma.$transaction((tx) => ensureSystemDefaults(tx));
    assert.deepEqual(await snapshot(), before);
    console.log('PASS: migration and upsert preserve existing data, customized metadata and relations');

    const beforeReset = await defaults();
    assert.deepEqual(await clearVaultData(), { profiles: 1 });
    assert.equal(await prisma.profile.count(), 0);
    assert.equal(await prisma.tag.count(), 0);
    assert.equal(await prisma.platform.findUnique({ where: { id: customPlatform.id } }), null);
    assert.equal(await prisma.collection.findUnique({ where: { id: customCollection.id } }), null);
    assert.deepEqual(await defaults(), beforeReset);
    assert.equal(await prisma.platform.count(), 5);
    assert.equal(await prisma.collection.count(), 2);
    console.log('PASS: full reset clears user data and preserves all system records and IDs');

    await prisma.platform.delete({ where: { key: 'tiktok' } });
    await prisma.collection.delete({ where: { name: SYSTEM_COLLECTION_NAMES[1] } });
    await clearVaultData();
    const repaired = await defaults();
    assert.equal(repaired.platforms.length, 5);
    assert.equal(repaired.collections.length, 2);
    assert.deepEqual(repaired.platforms.find((item) => item.key === 'instagram'), beforeReset.platforms.find((item) => item.key === 'instagram'));
    assert.deepEqual(repaired.collections[0], beforeReset.collections[0]);
    await clearVaultData();
    assert.deepEqual(await defaults(), repaired);
    console.log('PASS: reset repairs missing defaults and repeated reset is idempotent');
  } finally {
    if (disconnect) await disconnect();
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
