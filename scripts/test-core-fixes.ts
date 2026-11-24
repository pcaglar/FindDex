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

    // ---- 0.3.0 features: start from a clean archive -----------------------------------------
    const { foldText, foldSql } = await import('../src/lib/textFold');
    const bulk = await import('../src/lib/bulkService');
    const savedFilters = await import('../src/lib/savedFilters');
    const resetArchive = async () => {
      await prisma.profile.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.collection.deleteMany({ where: { name: { notIn: ['Favoriler', 'Sonra Bak'] } } });
      await prisma.savedFilter.deleteMany();
    };
    await resetArchive();
    const make = (username: string, displayName: string, extra: Record<string, unknown> = {}) =>
      service.createProfile({ username, displayName, avatarUrl: '/api/uploads/fd_x.png', platformLinks: [{ platformKey: 'instagram', url: `https://instagram.com/${username}` }], ...extra } as Parameters<typeof service.createProfile>[0]);

    // 10. JS and SQL folding agree, and Turkish search ignores case/diacritics -----------------
    const samples = ['İSTANBUL ığdır', 'ÇAĞRI Şükrü Öztürk', 'ÉLÉNA Zoë', 'Straße Œuvre', 'ŁÓDŹ Ñandú', 'Дом ДОМ', 'plain ASCII Text', "O'Brien 100%", ''];
    for (const sample of samples) {
      const [row] = await prisma.$queryRawUnsafe<{ v: string }[]>(`SELECT ${foldSql('?')} AS v`, sample);
      assert.equal(row.v, foldText(sample), `fold mismatch for "${sample}"`);
    }
    assert.equal(foldText('İpek'), foldText('IPEK'));
    assert.equal(foldText('ıpek'), foldText('İPEK'));
    await make('ipek_y', 'İpek Yıldız', { bio: 'İstanbul doğumlu', tags: ['Türkiye', 'Moda'] });
    await make('cagri', 'Çağrı Şahin', { notes: 'Öğretmen', tags: ['Türkiye'] });
    await make('elena', 'Elena Rose', { tags: ['Moda', 'Europe'] });
    const trashedMatch = await make('ipek_gone', 'İpek Gone');
    await service.softDeleteProfile(trashedMatch.id);
    const names = async (search: string) => (await service.getProfilesPage({ search, page: 1, pageSize: 50 })).profiles.map((item) => item.username).sort();
    assert.deepEqual(await names('ipek'), ['ipek_y']);
    assert.deepEqual(await names('IPEK'), ['ipek_y']);
    assert.deepEqual(await names('İPEK'), ['ipek_y']);
    assert.deepEqual(await names('yildiz'), ['ipek_y']);
    assert.deepEqual(await names('ISTANBUL'), ['ipek_y'], 'bio match');
    assert.deepEqual(await names('turkiye'), ['cagri', 'ipek_y'], 'tag match, diacritics folded');
    assert.deepEqual(await names('sahin cagri'), ['cagri'], 'terms are ANDed in any order');
    assert.deepEqual(await names('ogretmen'), ['cagri'], 'notes match');
    assert.deepEqual(await names('instagram.com/elena'), ['elena'], 'link URL match');
    assert.deepEqual(await names('ipek elena'), [], 'every term must match');
    assert.deepEqual(await names('100%'), [], 'wildcard characters are literal');
    assert.equal((await service.getProfilesPage({ search: 'ipek', includeDeleted: true, page: 1, pageSize: 10 })).profiles[0].username, 'ipek_gone');
    console.log('PASS: Turkish/accent-insensitive search (JS and SQL folding agree)');

    // 11. Multi-tag filters ------------------------------------------------------------------
    const tagged = async (tags: string[], tagMode: 'all' | 'any') => (await service.getProfilesPage({ tags, tagMode, page: 1, pageSize: 50 })).profiles.map((item) => item.username).sort();
    assert.deepEqual(await tagged(['Türkiye', 'Moda'], 'all'), ['ipek_y']);
    assert.deepEqual(await tagged(['Türkiye', 'Moda'], 'any'), ['cagri', 'elena', 'ipek_y']);
    assert.deepEqual(await tagged(['Europe'], 'all'), ['elena']);
    assert.deepEqual(await tagged(['Nope'], 'any'), []);
    const later = await prisma.collection.findUniqueOrThrow({ where: { name: 'Sonra Bak' } });
    const cagriId = (await prisma.profile.findFirstOrThrow({ where: { username: 'cagri' } })).id;
    await prisma.profileCollection.create({ data: { profileId: cagriId, collectionId: later.id } });
    const combined = await service.getProfilesPage({ filter: 'later', tags: ['Türkiye'], search: 'cagri', page: 1, pageSize: 10 });
    assert.deepEqual(combined.profiles.map((item) => item.username), ['cagri'], 'search, tags and watch-later combine');
    console.log('PASS: multi-tag filters (all/any) combine with search and collections');

    // 12. Stats are aggregated in SQL and agree with the data ---------------------------------
    const stats = await service.getStats();
    assert.equal(stats.total, 3);
    assert.equal(stats.trashCount, 1);
    assert.equal(stats.later, 1);
    assert.equal(stats.platforms.instagram, 3);
    assert.deepEqual({ Türkiye: stats.tags['Türkiye'], Moda: stats.tags['Moda'], Europe: stats.tags['Europe'] }, { Türkiye: 2, Moda: 2, Europe: 1 });
    assert.equal(stats.collections['Sonra Bak'], 1);
    console.log('PASS: getStats aggregates without loading profiles');

    // 13. Bulk actions --------------------------------------------------------------------------
    const all = await prisma.profile.findMany({ where: { deletedAt: null }, select: { id: true, username: true } });
    const ids = all.map((item) => item.id);
    await assert.rejects(async () => bulk.parseBulkIds([]), bulk.BulkInputError);
    await assert.rejects(async () => bulk.parseBulkIds(Array.from({ length: 501 }, (_, index) => `id${index}`)), bulk.BulkInputError);
    await assert.rejects(bulk.bulkUpdateProfiles({ ids, action: 'addTags', tags: [] }), bulk.BulkInputError);
    await assert.rejects(bulk.bulkUpdateProfiles({ ids, action: 'explode' as never }), bulk.BulkInputError);
    assert.equal((await bulk.bulkUpdateProfiles({ ids: [...ids, trashedMatch.id, 'missing'], action: 'addTags', tags: ['Bulk', ' Moda '] })).affected, 3, 'trashed and unknown ids are ignored');
    assert.deepEqual(await tagged(['Bulk'], 'all'), ['cagri', 'elena', 'ipek_y']);
    assert.equal((await bulk.bulkUpdateProfiles({ ids, action: 'addTags', tags: ['Bulk'] })).affected, 0, 'adding an existing tag changes nothing');
    assert.equal((await bulk.bulkUpdateProfiles({ ids, action: 'removeTags', tags: ['Bulk', 'Missing'] })).affected, 3);
    assert.deepEqual(await tagged(['Bulk'], 'any'), []);
    assert.equal((await bulk.bulkUpdateProfiles({ ids, action: 'addCollections', collections: ['Batch'] })).affected, 3);
    assert.equal((await bulk.bulkUpdateProfiles({ ids: [ids[0]], action: 'removeCollections', collections: ['Batch'] })).affected, 1);
    assert.equal((await service.getProfilesPage({ collection: 'Batch', page: 1, pageSize: 10 })).total, 2);
    assert.equal((await bulk.bulkUpdateProfiles({ ids, action: 'favorite' })).affected, 3);
    assert.equal((await bulk.bulkUpdateProfiles({ ids, action: 'favorite' })).affected, 0);
    assert.equal((await bulk.bulkUpdateProfiles({ ids: [ids[0]], action: 'unfavorite' })).affected, 1);
    const bulkLogs = await prisma.activityLog.findMany({ where: { profileId: ids[0] }, select: { action: true } });
    for (const action of ['TAG_ADDED', 'TAG_REMOVED', 'COLLECTION_ADDED', 'COLLECTION_REMOVED', 'FAVORITED', 'UNFAVORITED']) {
      assert.ok(bulkLogs.some((log) => log.action === action), `activity log ${action}`);
    }
    assert.equal((await bulk.bulkUpdateProfiles({ ids: ids.slice(0, 2), action: 'trash' })).affected, 2);
    assert.equal((await prisma.profile.count({ where: { deletedAt: null } })), 1);
    assert.equal((await bulk.bulkRestoreProfiles([...ids.slice(0, 2), 'missing'])).affected, 2);
    assert.equal((await bulk.bulkUpdateProfiles({ ids: ids.slice(0, 2), action: 'trash' })).affected, 2);
    assert.equal((await bulk.bulkDeleteTrashedProfiles([...ids, 'missing'])).affected, 2, 'only trashed profiles are deleted permanently');
    assert.equal(await prisma.profile.count({ where: { id: { in: ids } } }), 1, 'the still-active profile survives');
    console.log('PASS: bulk tag/collection/favorite/trash/restore/delete actions');

    // 14. Saved filters -------------------------------------------------------------------------
    const saved = await savedFilters.saveFilter('Türkiye + Moda', { search: ' ipek ', tab: 'instagram', tags: ['Türkiye', 'Moda', 'Moda', ''], tagMode: 'any', collection: 'Batch', sort: 'bogus' });
    assert.deepEqual(saved.filters, { search: 'ipek', tab: 'instagram', tags: ['Türkiye', 'Moda'], tagMode: 'any', collection: 'Batch', sort: 'newest' });
    const again = await savedFilters.saveFilter('Türkiye + Moda', { tags: ['Europe'] });
    assert.equal(again.id, saved.id, 'saving under the same name replaces it');
    assert.deepEqual((await savedFilters.listSavedFilters()).map((item) => item.filters.tags), [['Europe']]);
    await assert.rejects(savedFilters.saveFilter('   ', {}), savedFilters.SavedFilterInputError);
    const snapshotData = (await (await exportRoute.GET(new NextRequest('http://localhost/api/export?format=json'))).json()).data;
    assert.equal(snapshotData.savedFilters.length, 1, 'exports include saved filters');
    await prisma.savedFilter.deleteMany();
    const { importSnapshot } = await import('../src/lib/transfer');
    await importSnapshot({ format: 'finddex-export', data: snapshotData }, 'merge');
    assert.equal(await prisma.savedFilter.count(), 1, 'merge import restores saved filters');
    await importSnapshot({ format: 'finddex-export', data: snapshotData }, 'replace');
    assert.equal(await prisma.savedFilter.count(), 1, 'replace import restores saved filters');
    const { clearVaultData } = await import('../src/lib/vaultMaintenance');
    await clearVaultData();
    assert.equal(await prisma.savedFilter.count(), 0, 'reset removes saved filters');
    assert.equal(await savedFilters.deleteSavedFilter('missing'), false);
    console.log('PASS: saved filters sanitize, upsert by name, export/import and reset');

    // 15. Thumbnails ------------------------------------------------------------------------------
    const sharp = (await import('sharp')).default;
    const { uploadsDirectory } = await import('../src/lib/uploadStorage');
    const { getThumbnail } = await import('../src/lib/thumbnails');
    const { deleteStoredImage } = await import('../src/lib/imageStorage');
    const uploadsRoute = await import('../src/app/api/uploads/[filename]/route');
    const noise = Buffer.alloc(2000 * 1500 * 3);
    for (let index = 0; index < noise.length; index += 1) noise[index] = (index * 7919) % 251;
    const big = await sharp(noise, { raw: { width: 2000, height: 1500, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
    await writeFile(path.join(uploadsDirectory, 'fd_big.jpg'), big);
    await writeFile(path.join(uploadsDirectory, 'fd_tiny.png'), png);
    const fetchUpload = (name: string, query = '') => uploadsRoute.GET(new Request(`http://localhost/api/uploads/${name}${query}`), { params: { filename: name } });
    const original = await fetchUpload('fd_big.jpg');
    assert.equal(original.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await original.arrayBuffer()), big, 'without ?thumb=1 the original is served untouched');
    const thumb = await fetchUpload('fd_big.jpg', '?thumb=1');
    assert.equal(thumb.headers.get('content-type'), 'image/webp');
    const thumbBytes = Buffer.from(await thumb.arrayBuffer());
    const thumbMeta = await sharp(thumbBytes).metadata();
    assert.equal(thumbMeta.width, 640);
    assert.equal(thumbMeta.height, 480, 'aspect ratio is preserved');
    assert.ok(thumbBytes.length < big.length / 3, `thumbnail ${thumbBytes.length} should be far smaller than ${big.length}`);
    assert.deepEqual(await readdir(path.join(uploadsDirectory, '.thumbs')), ['fd_big.webp']);
    assert.equal((await Promise.all([getThumbnail('fd_big.jpg', path.join(uploadsDirectory, 'fd_big.jpg')), getThumbnail('fd_big.jpg', path.join(uploadsDirectory, 'fd_big.jpg'))])).every((item) => item?.contentType === 'image/webp'), true);
    const tiny = await fetchUpload('fd_tiny.png', '?thumb=1');
    assert.equal(tiny.headers.get('content-type'), 'image/png', 'small originals are served as they are');
    assert.equal((await fetchUpload('missing.png', '?thumb=1')).status, 404);
    assert.equal((await fetchUpload('..%2Fpasswd', '?thumb=1')).status, 400);
    const zipWithThumbs = await JSZip.loadAsync(await (await exportRoute.GET(new NextRequest('http://localhost/api/export?format=zip'))).arrayBuffer());
    assert.ok(zipWithThumbs.file('uploads/fd_big.jpg') && !Object.keys(zipWithThumbs.files).some((name) => name.includes('.thumbs')), 'archives contain originals only');
    const orphansWithThumbs = (await (await orphans.GET()).json()).data.map((item: { name: string }) => item.name).sort();
    assert.deepEqual(orphansWithThumbs, ['fd_big.jpg', 'fd_new.png', 'fd_tiny.png'], 'the .thumbs folder is never reported as orphans');
    await deleteStoredImage('/api/uploads/fd_big.jpg');
    assert.deepEqual(await list(path.join(uploadsDirectory, '.thumbs')), [], 'deleting an image removes its thumbnail');
    console.log('PASS: thumbnails are generated lazily, cached, excluded from archives and cleaned up');
  } finally {
    globalThis.fetch = originalFetch;
    if (disconnect) await disconnect();
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
