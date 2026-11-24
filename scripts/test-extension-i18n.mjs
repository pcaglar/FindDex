import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'finddex-instagram-extension');
const read = (file) => fs.readFile(path.join(root, file), 'utf8');
const messagesFor = async (language) => JSON.parse(await read(`_locales/${language}/messages.json`));

const usedKeys = (source, pattern) => [...source.matchAll(pattern)].map((match) => match[1]);

test('English and Turkish define exactly the same message keys, each with a message', async () => {
  const [en, tr] = [await messagesFor('en'), await messagesFor('tr')];
  assert.deepEqual(Object.keys(en).sort(), Object.keys(tr).sort());
  for (const [language, messages] of [['en', en], ['tr', tr]]) {
    for (const [key, value] of Object.entries(messages)) {
      assert.match(key, /^[A-Za-z0-9_@]+$/, `${language}.${key} is not a valid Chrome message name`);
      assert.ok(typeof value.message === 'string' && value.message.trim(), `${language}.${key} has no message`);
    }
  }
});

test('every key used by the popup, background worker and manifest exists', async () => {
  const en = await messagesFor('en');
  const [popupHtml, popupJs, backgroundJs, manifest] = await Promise.all([read('popup.html'), read('popup.js'), read('background.js'), read('manifest.json')]);
  const keys = new Set([
    ...usedKeys(popupHtml, /data-i18n(?:-title|-placeholder|-alt)?="([^"]+)"/g),
    ...usedKeys(popupJs, /\btr\('([^']+)'\)/g),
    ...usedKeys(backgroundJs, /\bt\('([^']+)'\)/g),
    ...usedKeys(manifest, /__MSG_([A-Za-z0-9_@]+)__/g),
    // background.js builds reason keys from the codes the FindDex API returns
    'reasonSAME_USERNAME', 'reasonSAME_URL', 'reasonSIMILAR_NAME',
  ]);
  assert.ok(keys.size > 25);
  for (const key of keys) assert.ok(key in en, `missing message "${key}"`);
});

test('the manifest declares a default locale that exists', async () => {
  const manifest = JSON.parse(await read('manifest.json'));
  assert.equal(manifest.default_locale, 'en');
  await fs.access(path.join(root, '_locales', manifest.default_locale, 'messages.json'));
});

test('no inline dictionaries remain in the extension scripts', async () => {
  for (const file of ['popup.js', 'background.js']) {
    const source = await read(file);
    assert.doesNotMatch(source, /const messages = \{/, file);
    assert.doesNotMatch(source, /language === 'tr' \?/, file);
  }
});

test('the loader uses the chosen language, falls back to English, then to the key', async () => {
  const fixtures = {
    en: { hello: { message: 'Hello' }, onlyEnglish: { message: 'English only' } },
    tr: { hello: { message: 'Merhaba' } },
  };
  const requested = [];
  const context = {
    chrome: { runtime: { getURL: (file) => `chrome-extension://id/${file}` } },
    fetch: async (url) => {
      requested.push(url);
      const language = url.match(/_locales\/(\w+)\//)[1];
      return { json: async () => fixtures[language] };
    },
  };
  vm.createContext(context);
  vm.runInContext(`${await read('i18n.js')}\nglobalThis.FindDexI18n = FindDexI18n;`, context);
  const turkish = await context.FindDexI18n.createTranslator('tr');
  assert.equal(turkish('hello'), 'Merhaba');
  assert.equal(turkish('onlyEnglish'), 'English only');
  assert.equal(turkish('nope'), 'nope');
  const unknown = await context.FindDexI18n.createTranslator('de');
  assert.equal(unknown('hello'), 'Hello', 'unsupported languages use English');
  assert.equal(requested.filter((url) => url.includes('/en/')).length, 1, 'each language file is fetched once');
});
