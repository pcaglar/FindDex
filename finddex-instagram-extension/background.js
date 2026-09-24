chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'SAVE_PROFILE') return;
  (async () => {
    const { serverUrl, apiKey, language = 'en' } = await chrome.storage.local.get(['serverUrl', 'apiKey', 'language']);
    const text = language === 'tr' ? {
      setup: 'Önce FindDex adresini ve API anahtarını kaydedin.', invalidKey: 'API anahtarı geçersiz.', server: 'Sunucu hatası',
    } : {
      setup: 'Save the FindDex address and API key first.', invalidKey: 'The API key is invalid.', server: 'Server error',
    };
    if (!serverUrl || !apiKey) throw new Error(text.setup);
    const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/external/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(message.profile),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const duplicate = result.duplicates?.[0];
      const detail = duplicate ? ` ${duplicate.displayName} (@${duplicate.username}): ${duplicate.reasons.join(', ')}` : '';
      throw new Error(`${response.status === 401 ? text.invalidKey : result.error || `${text.server} (${response.status})`}${detail}`);
    }
    return result;
  })().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
