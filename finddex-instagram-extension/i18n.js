// Loads the extension's own _locales/<lang>/messages.json for the language chosen in the popup.
// chrome.i18n.getMessage() always follows the browser language, but this extension lets the user pick
// English or Türkçe independently, so the standard message files are read directly. Usable from the
// popup (<script>) and the service worker (importScripts).
const FindDexI18n = (() => {
  const cache = {};

  async function load(language) {
    if (!cache[language]) {
      const response = await fetch(chrome.runtime.getURL(`_locales/${language}/messages.json`));
      cache[language] = await response.json();
    }
    return cache[language];
  }

  /** Returns translate(key): the chosen language, then English, then the key itself. */
  async function createTranslator(language) {
    const chosen = language === 'tr' ? 'tr' : 'en';
    const [primary, fallback] = await Promise.all([load(chosen), load('en')]);
    return (key) => primary[key]?.message ?? fallback[key]?.message ?? key;
  }

  return { createTranslator };
})();
