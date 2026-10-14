import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import { createTranslator, createUpdateHandler, extractInstagramUrls } from './telegram-bot.mjs';

const en = JSON.parse(await fs.readFile(new URL('../locales/en.json', import.meta.url), 'utf8'));
const tr = JSON.parse(await fs.readFile(new URL('../locales/tr.json', import.meta.url), 'utf8'));
const profile = 'https://www.instagram.com/example/';
const post = 'https://www.instagram.com/p/Example_123/';

test('shared text, captions and hidden links are normalized without accepting lookalike domains', () => {
  assert.deepEqual(extractInstagramUrls({ text: `Look (${post}?igsh=tracking). ${post}`, entities: [{ type: 'text_link', url: profile }] }), [post, profile]);
  assert.deepEqual(extractInstagramUrls({ caption: 'https://m.instagram.com/reels/Example_123/?tracking=1' }), ['https://www.instagram.com/reel/Example_123/']);
  for (const url of ['https://instagram.com.evil.test/p/x/', 'https://instagram.com@evil.test/p/x/', 'https://www.instagram.com:8582/p/x/', 'https://www.instagram.com/accounts/login/', 'https://www.instagram.com/p/']) {
    assert.deepEqual(extractInstagramUrls({ text: url }), []);
  }
});

function harness(overrides = {}) {
  const replies = [];
  const imports = [];
  const handle = createUpdateHandler({
    allowedUserId: '12345', apiKey: randomBytes(32).toString('hex'), language: 'en', translate: createTranslator(en.telegramBot),
    sendMessage: async (chat, text) => { replies.push({ chat, text }); },
    importProfile: async (url) => { imports.push(url); return { success: true, data: { id: 'test', username: 'example', displayName: 'Example', outcome: 'created', imagesAdded: 3 } }; },
    ...overrides,
  });
  const update = (text, from = 12345, type = 'private') => ({ update_id: 1, message: { text, from: { id: from }, chat: { id: from, type } } });
  return { handle, update, replies, imports };
}

test('only the allowlisted private user can trigger imports', async () => {
  const h = harness();
  await h.handle(h.update(post, 98765));
  await h.handle(h.update(post, 12345, 'group'));
  await h.handle({ channel_post: { text: post } });
  assert.deepEqual(h.imports, []);
  assert.deepEqual(h.replies, []);
  await h.handle(h.update(post));
  assert.deepEqual(h.imports, [post]);
  assert.match(h.replies[0].text, /3 photos/);
});

test('whoami works without allowing imports; setup fails closed', async () => {
  const h = harness({ allowedUserId: '' });
  await h.handle(h.update('/whoami', 98765));
  assert.match(h.replies[0].text, /98765/);
  await h.handle(h.update(post, 98765));
  assert.match(h.replies[1].text, /Imports are disabled/);
  assert.deepEqual(h.imports, []);
});

test('a missing API key never sends import requests', async () => {
  const h = harness({ apiKey: '' });
  await h.handle(h.update(post));
  assert.deepEqual(h.imports, []);
  assert.match(h.replies[0].text, /API key is missing/);
});

test('errors and Turkish replies use locales; no signed URL or error body is exposed', async () => {
  const h = harness({ language: 'tr', translate: createTranslator(tr.telegramBot),
    importProfile: async () => ({ success: false, code: 'IMAGE_DOWNLOAD_FAILED', error: 'secret remote URL' }) });
  await h.handle(h.update(post));
  assert.equal(h.replies[0].text, tr.telegramBot.errors.IMAGE_DOWNLOAD_FAILED);
  assert.ok(!h.replies[0].text.includes('secret'));
  assert.equal(createTranslator(tr.telegramBot)('errors.UNKNOWN'), tr.telegramBot.errors.IMPORT_FAILED);
});

test('delivery failure propagates so the update is not acknowledged', async () => {
  const h = harness({ sendMessage: async () => { throw new Error('delivery failed'); } });
  await assert.rejects(h.handle(h.update(post)), /delivery failed/);
});

test('both languages define the same translation keys', () => {
  const keys = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`]);
  assert.deepEqual(keys(en).sort(), keys(tr).sort());
});
