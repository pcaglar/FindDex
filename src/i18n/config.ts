export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';
export const LANGUAGE_STORAGE_KEY = 'finddex-language';
export const LANGUAGE_COOKIE_KEY = 'finddex-language';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function languageLocale(language: AppLanguage) {
  return language === 'tr' ? 'tr-TR' : 'en-US';
}
