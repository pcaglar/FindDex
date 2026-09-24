'use client';

import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { PropsWithChildren, useEffect, useState } from 'react';
import en from '../../locales/en.json';
import tr from '../../locales/tr.json';
import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  type AppLanguage,
} from './config';

const instance = i18n.createInstance();

void instance.init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

function persistLanguage(language: AppLanguage) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.lang = language;
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const language = isAppLanguage(saved) ? saved : DEFAULT_LANGUAGE;
    persistLanguage(language);
    void instance.changeLanguage(language).then(() => setReady(true));

    const handleLanguageChanged = (next: string) => {
      if (isAppLanguage(next)) persistLanguage(next);
    };
    instance.on('languageChanged', handleLanguageChanged);
    return () => instance.off('languageChanged', handleLanguageChanged);
  }, []);

  return (
    <I18nextProvider i18n={instance}>
      <div className={ready ? undefined : 'invisible'}>{children}</div>
    </I18nextProvider>
  );
}
