import type { TFunction } from 'i18next';
import { languageLocale, type AppLanguage } from './config';

export function formatDateTime(value: string | Date, language: AppLanguage, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(languageLocale(language), options ?? {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDate(value: string | Date, language: AppLanguage, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(languageLocale(language), options ?? { dateStyle: 'long' }).format(new Date(value));
}

export function formatNumber(value: number, language: AppLanguage, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(languageLocale(language), options).format(value);
}

export function currentLanguage(language: string): AppLanguage {
  return language === 'tr' ? 'tr' : 'en';
}

export function translatedApiError(t: TFunction, message: unknown, fallbackKey = 'errors.generic') {
  if (typeof message !== 'string' || !message.trim()) return t(fallbackKey);
  const key = `apiErrors.${message}`;
  const translated = t(key);
  return translated === key ? message : translated;
}
