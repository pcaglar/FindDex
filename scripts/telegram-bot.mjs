import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function extractInstagramUrls(message) {
  const content = `${message.text || ''}\n${message.caption || ''}`;
  const entities = [...(message.entities || []), ...(message.caption_entities || [])];
  const candidates = [...(content.match(/https?:\/\/[^\s<>]+/gi) || []), ...entities.filter((item) => item.type === 'text_link').map((item) => item.url)];
  const urls = new Set();
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate.replace(/[.,;!?)\]}]+$/, ''));
      if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname) || url.username || url.password || url.port) continue;
      const parts = url.pathname.split('/').filter(Boolean);
      const post = parts.length === 2 && ['p', 'reel', 'reels', 'tv'].includes(parts[0]) && /^[\w-]+$/.test(parts[1]);
      const profile = parts.length === 1 && /^[a-zA-Z0-9._]{1,30}$/.test(parts[0]) && !['accounts', 'direct', 'explore', 'stories', 'p', 'reel', 'reels', 'tv'].includes(parts[0].toLowerCase());
      if (!post && !profile) continue;
      if (post && parts[0] === 'reels') parts[0] = 'reel';
      if (profile) parts[0] = parts[0].toLowerCase();
      urls.add(`https://www.instagram.com/${parts.join('/')}/`);
    } catch { /* Ignore unrelated URLs. */ }
  }
  return [...urls];
}

export function createUpdateHandler({ allowedUserId, apiKey, importProfile, sendMessage, translate, language }) {
  const number = (value) => new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US').format(value);
  return async (update) => {
    const message = update.message;
    if (!message || message.chat?.type !== 'private' || !message.from || message.from.is_bot) return;
    const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
    const reply = (text) => sendMessage(message.chat.id, text);
    if (command === '/whoami') { await reply(translate('whoami', { id: String(message.from.id) })); return; }
    if (!allowedUserId) { await reply(translate('setup', { id: String(message.from.id) })); return; }
    if (String(message.from.id) !== allowedUserId) return;
    if (['/start', '/help'].includes(command)) { await reply(translate('help')); return; }
    if (!apiKey) { await reply(translate('notConfigured')); return; }
    const urls = extractInstagramUrls(message);
    if (!urls.length) { await reply(translate('invalidUrl')); return; }
    if (urls.length > 5) { await reply(translate('tooManyLinks')); return; }
    for (const url of urls) {
      let result;
      try { result = await importProfile(url); }
      catch { await reply(translate('connectionError')); continue; }
      if (!result.success) {
        const code = result.code || 'IMPORT_FAILED';
        await reply(translate(`errors.${code}`));
        continue;
      }
      const data = result.data;
      await reply(translate(data.outcome, { name: data.displayName, username: data.username, count: number(data.imagesAdded) }));
    }
  };
}

export function createTranslator(messages) {
  return (key, values = {}) => {
    const template = key.split('.').reduce((item, segment) => item?.[segment], messages);
    const fallback = typeof template === 'string' ? template : messages.errors.IMPORT_FAILED;
    return fallback.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name] ?? ''));
  };
}

async function main() {
  const language = process.env.TELEGRAM_BOT_LANGUAGE === 'tr' ? 'tr' : 'en';
  const locale = JSON.parse(await fs.readFile(new URL(`../locales/${language}.json`, import.meta.url), 'utf8'));
  const translate = createTranslator(locale.telegramBot);
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID?.trim() || '';
  const apiKey = process.env.FINDDEX_BOT_API_KEY?.trim() || '';
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  if (allowedUserId && !/^[1-9]\d*$/.test(allowedUserId)) throw new Error('TELEGRAM_ALLOWED_USER_ID must be a positive numeric ID.');
  const finddexUrl = new URL(process.env.FINDDEX_INTERNAL_URL || 'http://127.0.0.1:3000');
  if (!['http:', 'https:'].includes(finddexUrl.protocol) || finddexUrl.username || finddexUrl.password) throw new Error('Invalid FINDDEX_INTERNAL_URL.');
  const stateDir = process.env.TELEGRAM_STATE_DIR || path.join(process.cwd(), 'data', 'telegram-bot');
  await fs.mkdir(stateDir, { recursive: true });
  const stateFile = path.join(stateDir, 'state.json');
  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  const signal = (timeout) => AbortSignal.any([shutdown.signal, AbortSignal.timeout(timeout)]);
  const telegram = async (method, payload, timeout = 20_000) => {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: signal(timeout), redirect: 'error',
    });
    const data = await response.json();
    // Telegram errors can contain details; never print their bodies or token URLs.
    if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed (${response.status}).`);
    return data.result;
  };
  const bot = await telegram('getMe', {});
  const webhook = await telegram('getWebhookInfo', {});
  if (webhook.url) throw new Error('This bot has a webhook. Use a dedicated bot or remove the webhook before starting long polling.');
  let offset = 0;
  try {
    const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    if (String(state.botId) === String(bot.id) && Number.isSafeInteger(state.offset) && state.offset >= 0) offset = state.offset;
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot read Telegram state; refusing to replay messages.');
  }
  const saveOffset = async (next) => {
    await fs.writeFile(`${stateFile}.tmp`, JSON.stringify({ botId: bot.id, offset: next }), { mode: 0o600 });
    await fs.rename(`${stateFile}.tmp`, stateFile);
    offset = next;
  };
  const handle = createUpdateHandler({ allowedUserId, apiKey, language, translate,
    sendMessage: (chatId, text) => telegram('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
    importProfile: async (url) => {
      const response = await fetch(new URL('/api/external/instagram', finddexUrl), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ url }), signal: signal(480_000), redirect: 'error',
      });
      return response.json();
    },
  });
  console.log(`[telegram] @${bot.username} connected; ${allowedUserId ? 'private imports enabled' : 'setup mode (/whoami only)'}.`);
  while (!shutdown.signal.aborted) {
    try {
      const updates = await telegram('getUpdates', { offset, timeout: 30, limit: 10, allowed_updates: ['message'] }, 40_000);
      for (const update of updates) {
        if (shutdown.signal.aborted) break;
        await handle(update);
        // Acknowledge only after processing and delivering the result.
        await saveOffset(update.update_id + 1);
      }
    } catch {
      if (shutdown.signal.aborted) break;
      console.error('[telegram] Processing failed; retrying in 5 seconds.');
      await new Promise((resolve) => {
        const timer = setTimeout(done, 5000);
        function done() { clearTimeout(timer); shutdown.signal.removeEventListener('abort', done); resolve(); }
        shutdown.signal.addEventListener('abort', done, { once: true });
      });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    // Do not expose errors containing a fetch URL with the bot token.
    console.error('[telegram] Startup failed. Check bot token, user ID, webhook, network and writable state directory.');
    process.exitCode = 1;
  });
}
