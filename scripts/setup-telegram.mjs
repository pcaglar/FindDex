import fs from 'node:fs/promises';
import path from 'node:path';
import { createTranslator } from './telegram-bot.mjs';

const language = process.env.TELEGRAM_BOT_LANGUAGE === 'tr' ? 'tr' : 'en';
const locale = JSON.parse(await fs.readFile(new URL(`../locales/${language}.json`, import.meta.url), 'utf8'));
const translate = createTranslator(locale.telegramBot);

try {
  const target = path.join(process.cwd(), '.env');
  const baseUrl = process.env.FINDDEX_SETUP_URL || `http://127.0.0.1:${process.env.APP_PORT || 12000}`;
  let key = process.env.FINDDEX_BOT_API_KEY?.trim();
  if (!key) {
    const response = await fetch(new URL('/api/settings/api-keys', baseUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: translate('keyLabel') }),
      signal: AbortSignal.timeout(15_000), redirect: 'error',
    });
    const result = await response.json();
    if (!response.ok || !result.success || typeof result.data?.key !== 'string') throw new Error('Key creation failed.');
    key = result.data.key;
  }
  // Preserve the existing file and values, including any token entered during setup.
  let content = await fs.readFile(target, 'utf8');
  const setIfEmpty = (name, value) => {
    const pattern = new RegExp(`^${name}=([^\\r\\n]*)`, 'm');
    const existing = content.match(pattern);
    if (existing && !['', '""', "''"].includes(existing[1].trim())) return;
    const line = `${name}=${value}`;
    content = existing ? content.replace(pattern, () => line) : `${content.trimEnd()}\n${line}\n`;
  };
  setIfEmpty('FINDDEX_BOT_API_KEY', key);
  setIfEmpty('FINDDEX_INTERNAL_URL', baseUrl);
  setIfEmpty('TELEGRAM_BOT_TOKEN', '');
  setIfEmpty('TELEGRAM_ALLOWED_USER_ID', '');
  setIfEmpty('TELEGRAM_BOT_LANGUAGE', 'en');
  setIfEmpty('INSTAGRAM_SCRAPER_URL', '');
  await fs.writeFile(target, content, { mode: 0o600 });
  await fs.chmod(target, 0o600);
  console.log(translate('setupReady'));
} catch {
  console.error(translate('setupFailed'));
  process.exitCode = 1;
}
