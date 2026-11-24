importScripts('i18n.js');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'SAVE_PROFILE') return;
  (async () => {
    const { serverUrl, apiKey, language = 'en' } = await chrome.storage.local.get(['serverUrl', 'apiKey', 'language']);
    const t = await FindDexI18n.createTranslator(language);
    if (!serverUrl || !apiKey) throw new Error(t('errorSetup'));
    const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/external/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(message.profile),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const duplicate = result.duplicates?.[0];
      const detail = duplicate ? ` ${duplicate.displayName} (@${duplicate.username}): ${duplicate.reasons.map((reason) => t(`reason${reason}`)).join(', ')}` : '';
      throw new Error(`${response.status === 401 ? t('errorInvalidKey') : result.error || `${t('errorServer')} (${response.status})`}${detail}`);
    }
    return result;
  })().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
