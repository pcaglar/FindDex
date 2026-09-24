import type { NextRequest } from 'next/server';
import { DEFAULT_LANGUAGE, isAppLanguage, LANGUAGE_COOKIE_KEY, type AppLanguage } from './config';

export function requestLanguage(request: NextRequest): AppLanguage {
  const value = request.cookies.get(LANGUAGE_COOKIE_KEY)?.value;
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function apiText(request: NextRequest, english: string, turkish: string) {
  return requestLanguage(request) === 'tr' ? turkish : english;
}
