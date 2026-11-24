import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';

// Everything runs against a disposable database, uploads and backups directory.
async function main() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'finddex-core-test-'));
  process.env.DATABASE_URL = `file:${path.join(directory, 'dev.db')}`;
  process.env.UPLOADS_DIR = path.join(directory, 'uploads');
  process.env.BACKUPS_DIR = path.join(directory, 'backups');
  delete process.env.ALLOW_PRIVATE_IMAGE_HOSTS;
  const originalFetch = globalThis.fetch;
  let disconnect: (() => Promise<void>) | undefined;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO1sAAAAASUVORK5CYII=', 'base64');
  const list = async (dir: string) => readdir(dir).catch(() => [] as string[]);

  try {
    execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
    await mkdir(process.env.UPLOADS_DIR, { recursive: true });
    const { prisma } = await import('../src/lib/prisma');
    disconnect = () => prisma.$disconnect();
    const { NextRequest } = await import('next/server');
    const service = await import('../src/lib/profileService');
    const { isPrivateAddress, assertPublicHost } = await import('../src/lib/networkGuard');
    const { downloadAndStoreImage } = await import('../src/lib/remoteImage');
    const { ensureSystemDefaults } = await import('../prisma/systemDefaults');
    await ensureSystemDefaults(prisma);

    // 1. Network guard ---------------------------------------------------------------
    for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.5', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1']) {
      assert.equal(isPrivateAddress(address), true, address);
    }
    for (const address of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111']) assert.equal(isPrivateAddress(address), false, address);
    for (const url of ['http://localhost/a.png', 'http://127.0.0.1:3000/a.png', 'http://[::1]/a.png', 'http://192.168.1.10/a.png', 'http://foo.localhost/a.png']) {
      await assert.rejects(assertPublicHost(new URL(url)), { name: 'PrivateHostError' }, url);
      await assert.rejects(downloadAndStoreImage(url), { code: 'INVALID_IMAGE_URL' }, url);
    }
    await assertPublicHost(new URL('https://93.184.216.34/a.png'));
    let hops = 0;
    globalThis.fetch = async (input) => {
      hops += 1;
      const url = new URL(String(input));
      if (url.hostname === '93.184.216.34') return new Response(null, { status: 302, headers: { Location: 'http://169.254.169.254/latest/meta-data' } });
      throw new Error(`unexpected request to ${url.href}`);
    };
    await assert.rejects(downloadAndStoreImage('http://93.184.216.34/a.png'), { code: 'INVALID_IMAGE_URL' });
    assert.equal(hops, 1, 'a redirect into a private address must not be requested');
    globalThis.fetch = originalFetch;
    console.log('PASS: private, loopback and redirect-to-private image URLs are rejected');

    // 2. Atomic profile updates ----------------------------------------------------------
    const instagram = await prisma.platform.findUniqueOrThrow({ where: { key: 'instagram' } });
    const profile = await service.createProfile({
      username: 'atomic', displayName: 'Atomic', avatarUrl: '/api/uploads/fd_a.png', tags: ['one', 'one', ' two '], collections: ['Col'],
      platformLinks: [{ platformId: instagram.id, url: 'https://instagram.com/atomic' }, { platformId: instagram.id, url: 'https://instagram.com/atomic-backup' }],
    });
    assert.deepEqual([...profile.tags].sort(), ['one', 'two']);
    const logsBefore = await prisma.activityLog.count({ where: { profileId: profile.id } });
    await assert.rejects(service.updateProfile(profile.id, { tags: ['changed'], collections: [], notes: 'new note', platformLinks: [{ platformId: instagram.id, url: 42 }] }));
    const afterFailure = (await service.getProfileById(profile.id))!;
    assert.deepEqual([...afterFailure.tags].sort(), ['one', 'two']);
    assert.deepEqual(afterFailure.collections, ['Col']);
    assert.equal(afterFailure.notes, null);
    assert.equal(afterFailure.platformLinks.length, 2);
    assert.equal(await prisma.activityLog.count({ where: { profileId: profile.id } }), logsBefore);
    const updated = (await service.updateProfile(profile.id, { tags: ['two', 'three'], notes: 'ok' }))!;
    assert.deepEqual([...updated.tags].sort(), ['three', 'two']);
    assert.equal(updated.notes, 'ok');
    console.log('PASS: a failed profile update leaves tags, collections, links and activity untouched');

    // 3. Platform counts: unique, active profiles only -----------------------------------
    const counts = async () => Object.fromEntries((await service.getAllPlatforms()).map((item) => [item.key, item.count]));
    assert.equal((await counts()).instagram, 1, 'two links on one profile count once');
    await service.softDeleteProfile(profile.id);
    assert.equal((await counts()).instagram, 0, 'trashed profiles are not counted');
    await service.restoreProfile(profile.id);
    console.log('PASS: platform counts are unique profiles and ignore trash');

    // 4. Duplicate reasons are language-neutral codes ------------------------------------
    const { findDuplicateProfiles } = await import('../src/lib/duplicateDetection');
    const duplicates = await findDuplicateProfiles({ username: '@Atomic', name: 'Atomicx', urls: ['https://www.instagram.com/atomic/'] });
    assert.equal(duplicates.length, 1);
    assert.deepEqual([...duplicates[0].reasons].sort(), ['SAME_URL', 'SAME_USERNAME', 'SIMILAR_NAME']);
    console.log('PASS: duplicate reasons are codes');

    // 5. API keys stay visible in the settings list (single-user, local install) ----------
    const keysRoute = await import('../src/app/api/settings/api-keys/route');
    const created = await (await keysRoute.POST(new NextRequest('http://localhost/api/settings/api-keys', { method: 'POST', body: JSON.stringify({ label: 'Test' }) }))).json();
    assert.match(created.data.key, /^fd_live_[0-9a-f]{64}$/);
    const listed = await (await keysRoute.GET()).json();
    assert.equal(listed.data.length, 1);
    assert.equal(listed.data[0].key, created.data.key);
    console.log('PASS: the API key list returns the full keys');

    // 6. Stats GET has no side effects; cleanup is an explicit POST -----------------------
    const old = await prisma.profile.create({ data: { username: 'old', displayName: 'Old', avatarUrl: '/api/uploads/fd_old.png', deletedAt: new Date(Date.now() - 100 * 86_400_000) } });
    const statsRoute = await import('../src/app/api/stats/route');
    await statsRoute.GET();
    assert.ok(await prisma.profile.findUnique({ where: { id: old.id } }), 'GET /api/stats must not delete anything');
    const trashRoute = await import('../src/app/api/maintenance/trash/route');
    assert.equal((await (await trashRoute.POST()).json()).data.deleted, 1);
    assert.equal(await prisma.profile.findUnique({ where: { id: old.id } }), null);
    console.log('PASS: expired trash is purged only by the explicit maintenance endpoint');

    // 7. Trash pagination ----------------------------------------------------------------
    for (let index = 0; index < 13; index += 1) {
      await prisma.profile.create({ data: { username: `t${index}`, displayName: `T${index}`, avatarUrl: '/x', deletedAt: new Date(Date.now() - index * 1000) } });
    }
    const trashList = await import('../src/app/api/trash/route');
    const getTrash = async (page: number) => (await trashList.GET(new NextRequest(`http://localhost/api/trash?page=${page}`))).json();
    const first = await getTrash(1);
    assert.equal(first.data.length, 12);
    assert.equal(first.pagination.total, 13);
    assert.equal(first.pagination.totalPages, 2);
    assert.equal(first.data[0].username, 't0', 'newest deletion first');
    assert.equal((await getTrash(2)).data.length, 1);
    console.log('PASS: trash is paginated, newest deletions first');
    await prisma.profile.deleteMany({ where: { username: { startsWith: 't' }, NOT: { username: 'atomic' } } });

    // 8. Orphan scan respects legacy avatar/cover columns --------------------------------
    const orphans = await import('../src/app/api/maintenance/orphans/route');
    await writeFile(path.join(process.env.UPLOADS_DIR, 'fd_legacy.png'), png);
    await writeFile(path.join(process.env.UPLOADS_DIR, 'fd_cover.png'), png);
    await writeFile(path.join(process.env.UPLOADS_DIR, 'fd_orphan.png'), png);
    await prisma.profile.create({ data: { username: 'legacy', displayName: 'Legacy', avatarUrl: '/api/uploads/fd_legacy.png', coverUrl: '/uploads/fd_cover.png' } });
    const orphanNames = (await (await orphans.GET()).json()).data.map((item: { name: string }) => item.name);
    assert.deepEqual(orphanNames, ['fd_orphan.png']);
    const deleted = await orphans.DELETE(new NextRequest('http://localhost/api/maintenance/orphans', { method: 'DELETE', body: JSON.stringify({ filenames: ['fd_legacy.png', 'fd_cover.png', 'fd_orphan.png'] }) }));
    assert.equal((await deleted.json()).data.deleted, 1);
    assert.deepEqual((await list(process.env.UPLOADS_DIR)).sort(), ['fd_cover.png', 'fd_legacy.png']);
    console.log('PASS: avatar/cover-only files are never reported or deleted as orphans');

    // 9. Export/import use UPLOADS_DIR; replace saves a safety copy first ----------------
    const exportRoute = await import('../src/app/api/export/route');
    const archive = await JSZip.loadAsync(await (await exportRoute.GET(new NextRequest('http://localhost/api/export?format=zip'))).arrayBuffer());
    assert.ok(archive.file('uploads/fd_legacy.png'), 'ZIP export must read UPLOADS_DIR');
    const importRoute = await import('../src/app/api/import/route');
    const upload = async (zip: JSZip, mode: string) => {
      const form = new FormData();
      form.append('file', new File([await zip.generateAsync({ type: 'arraybuffer' })], 'import.zip', { type: 'application/zip' }));
      form.append('mode', mode);
      return (await importRoute.POST(new NextRequest('http://localhost/api/import', { method: 'POST', body: form }))).json();
    };
    const snapshot = JSON.parse(await archive.file(/finddex-export-.*\.json$/)[0].async('string'));

    // A replace ZIP without images keeps the existing files that records still point to.
    const noImages = new JSZip();
    noImages.file('finddex-export-test.json', JSON.stringify(snapshot));
    const withoutImages = await upload(noImages, 'replace');
    assert.equal(withoutImages.success, true, JSON.stringify(withoutImages));
    assert.match(withoutImages.data.safetyBackup, /^finddex-backup-.*-before-import\.json$/);
    assert.deepEqual((await list(process.env.UPLOADS_DIR)).sort(), ['fd_cover.png', 'fd_legacy.png']);

    // A replace ZIP with images swaps the folder, ignores unsafe names and keeps a copy aside.
    const withImages = new JSZip();
    withImages.file('finddex-export-test.json', JSON.stringify(snapshot));
    withImages.file('uploads/fd_new.png', png);
    withImages.file('uploads/../escape.png', png);
    withImages.file('uploads/nested/deep.png', png);
    const swapped = await upload(withImages, 'replace');
    assert.equal(swapped.success, true, JSON.stringify(swapped));
    assert.deepEqual(await list(process.env.UPLOADS_DIR), ['fd_new.png']);
    assert.match(swapped.data.safetyUploads, /^uploads-before-import-/);
    assert.deepEqual((await list(path.join(process.env.BACKUPS_DIR, swapped.data.safetyUploads))).sort(), ['fd_cover.png', 'fd_legacy.png']);
    const safety = JSON.parse(await readFile(path.join(process.env.BACKUPS_DIR, swapped.data.safetyBackup), 'utf8'));
    assert.equal(safety.format, 'finddex-export');
    assert.ok(!(await list(directory)).includes('escape.png'));
    console.log('PASS: export/import honour UPLOADS_DIR and replace imports keep a safety copy');
  } finally {
    globalThis.fetch = originalFetch;
    if (disconnect) await disconnect();
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
