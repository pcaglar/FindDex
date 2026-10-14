import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function main() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'finddex-instagram-test-'));
  process.env.DATABASE_URL = `file:${path.join(directory, 'dev.db')}`;
  process.env.UPLOADS_DIR = path.join(directory, 'uploads');
  process.env.INSTAGRAM_SCRAPER_URL = 'http://scraper.test/scrape';
  const originalFetch = globalThis.fetch;
  let disconnect: (() => Promise<void>) | undefined;
  let scrapeCalls = 0;
  let downloadCalls = 0;
  let failImage = false;
  let invalidOwner = false;
  let wrongMime = false;
  let photos = 2;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO1sAAAAASUVORK5CYII=', 'base64');
  const source = (id: string) => `https://www.instagram.com/p/${id}/`;
  const files = async () => readdir(process.env.UPLOADS_DIR!).catch(() => [] as string[]);
  try {
    execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
    const { prisma } = await import('../src/lib/prisma');
    disconnect = () => prisma.$disconnect();
    const { importInstagramUrl, canonicalInstagramUrl } = await import('../src/lib/instagramImport');
    const { POST } = await import('../src/app/api/external/instagram/route');
    const { NextRequest } = await import('next/server');
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === 'scraper.test') {
        scrapeCalls += 1;
        return Response.json({ owner_info: { username: invalidOwner ? '' : 'example', full_name: 'Example', biography: 'Test bio', is_verified: true,
          links: ['https://example.org/'], profile_pic_url: 'https://scontent.cdninstagram.com/avatar.jpg' },
        post_info: { post_url: url.searchParams.get('url'), image_urls: Array.from({ length: photos }, (_, index) => `https://instagram.test.fbcdn.net/${index}.png`) } });
      }
      downloadCalls += 1;
      if (failImage && url.pathname === '/1.png') return new Response(null, { status: 403 });
      return new Response(png, { headers: { 'Content-Type': wrongMime ? 'text/html' : 'image/png' } });
    };
    const key = randomBytes(32).toString('hex');
    await prisma.apiKey.create({ data: { key, label: 'Disposable bot test' } });
    const request = (url: string, authorized = true) => new NextRequest('http://localhost/api/external/instagram', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ url }),
    });
    assert.equal((await POST(request(source('One'), false))).status, 401);
    assert.equal(scrapeCalls, 0);
    assert.equal((await POST(request('http://127.0.0.1/private'))).status, 400);
    assert.equal(scrapeCalls, 0);
    assert.equal(canonicalInstagramUrl('http://m.instagram.com/reels/One/?igsh=test'), 'https://www.instagram.com/reel/One/');
    console.log('PASS: bearer auth and Instagram URL validation reject unauthorized requests before network access');

    const response = await POST(request(source('One')));
    assert.equal(response.status, 201);
    const result = (await response.json()).data;
    assert.equal(result.imagesAdded, 3);
    const initial = await prisma.profile.findUniqueOrThrow({ where: { id: result.id }, include: { images: { orderBy: { sortOrder: 'asc' } }, platformLinks: true } });
    assert.equal(initial.images.length, 3);
    assert.equal(initial.images.filter((image) => image.isCover).length, 1);
    assert.equal(initial.isVerified, true);
    assert.ok(initial.platformLinks.some((link) => link.url === 'https://www.instagram.com/example/'));
    assert.ok(initial.platformLinks.some((link) => link.url === 'https://example.org/'));
    for (const image of initial.images) {
      assert.match(image.url, /^\/api\/uploads\/fd_.*\.png$/);
      assert.deepEqual(await readFile(path.join(process.env.UPLOADS_DIR!, image.url.split('/').pop()!)), png);
    }
    const downloads = downloadCalls;
    assert.equal((await importInstagramUrl(`${source('One')}?igsh=changed`)).outcome, 'already_saved');
    assert.equal(downloadCalls, downloads);
    assert.equal(scrapeCalls, 1);
    assert.equal(await prisma.profile.count(), 1);
    console.log('PASS: API saves owner, website, three local images; replay skips scraper and downloads');

    const tag = await prisma.tag.create({ data: { name: 'Keep tag' } });
    const collection = await prisma.collection.create({ data: { name: 'Keep collection' } });
    await prisma.profile.update({ where: { id: initial.id }, data: { notes: 'Keep notes', displayName: 'Keep name', isFavorite: true,
      tags: { create: { tagId: tag.id } }, collections: { create: { collectionId: collection.id } } } });
    photos = 1;
    assert.equal((await importInstagramUrl(source('Two'))).outcome, 'updated');
    const updated = await prisma.profile.findUniqueOrThrow({ where: { id: initial.id }, include: { images: true, tags: true, collections: true } });
    assert.equal(updated.images.length, 4);
    assert.equal(updated.images.filter((image) => image.isCover).length, 1);
    assert.equal(updated.avatarUrl, initial.avatarUrl);
    assert.equal(updated.notes, 'Keep notes');
    assert.equal(updated.displayName, 'Keep name');
    assert.equal(updated.isFavorite, true);
    assert.equal(updated.tags[0].tagId, tag.id);
    assert.equal(updated.collections[0].collectionId, collection.id);
    console.log('PASS: another post appends photos while preserving notes, name, favorite, tags, collection and cover');

    await prisma.profile.update({ where: { id: initial.id }, data: { deletedAt: new Date() } });
    const beforeTrash = downloadCalls;
    const trashResponse = await POST(request(source('One')));
    assert.equal(trashResponse.status, 409);
    assert.equal((await trashResponse.json()).code, 'PROFILE_IN_TRASH');
    await assert.rejects(importInstagramUrl(source('Three')), { code: 'PROFILE_IN_TRASH' });
    assert.equal(downloadCalls, beforeTrash);
    await prisma.profile.update({ where: { id: initial.id }, data: { deletedAt: null } });
    console.log('PASS: trashed profiles are never restored or modified automatically');

    const beforeFailure = (await files()).sort();
    photos = 2;
    failImage = true;
    await assert.rejects(importInstagramUrl(source('Failure')), { code: 'IMAGE_DOWNLOAD_FAILED' });
    assert.deepEqual((await files()).sort(), beforeFailure);
    assert.equal(await prisma.profileImage.count(), 4);
    failImage = false;
    wrongMime = true;
    await assert.rejects(importInstagramUrl(source('Mime')), { code: 'UNSUPPORTED_IMAGE' });
    assert.deepEqual((await files()).sort(), beforeFailure);
    wrongMime = false;
    invalidOwner = true;
    await assert.rejects(importInstagramUrl(source('Invalid')), { code: 'INVALID_SCRAPER_RESPONSE' });
    invalidOwner = false;
    photos = 21;
    await assert.rejects(importInstagramUrl(source('Many')), { code: 'TOO_MANY_IMAGES' });
    photos = 1;
    // Network downloads succeed, but a failed database write must also remove them.
    await prisma.platform.delete({ where: { key: 'instagram' } });
    await assert.rejects(importInstagramUrl(source('NoPlatform')), { code: 'INSTAGRAM_PLATFORM_MISSING' });
    assert.deepEqual((await files()).sort(), beforeFailure);
    console.log('PASS: image, MIME, payload and database failures leave no partial galleries or orphaned downloads');
  } finally {
    globalThis.fetch = originalFetch;
    if (disconnect) await disconnect();
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
