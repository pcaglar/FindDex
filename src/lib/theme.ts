export type Theme = 'dark' | 'light';
export type ThemePreference = Theme | 'system';

export const THEME_STORAGE_KEY = 'finddex-theme';
export const THEME_CHANGE_EVENT = 'finddex-theme-change';
const LEGACY_THEME_STORAGE_KEY = 'modelvault-theme';

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (!localStorage.getItem(THEME_STORAGE_KEY) && saved) localStorage.setItem(THEME_STORAGE_KEY, saved);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
}

export function resolveTheme(preference = getStoredThemePreference()): Theme {
  if (preference !== 'system') return preference;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyThemePreference(preference: ThemePreference, persist = true): Theme {
  const theme = resolveTheme(preference);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    root.style.colorScheme = theme;
  }
  if (typeof window !== 'undefined' && persist) {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { preference, theme } }));
  }
  return theme;
}

export function getStoredTheme(): Theme { return resolveTheme(); }
export function applyTheme(theme: Theme): void { applyThemePreference(theme); }

export function watchTheme(callback: (theme: Theme, preference: ThemePreference) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const sync = () => {
    const preference = getStoredThemePreference();
    callback(applyThemePreference(preference, false), preference);
  };
  const onStorage = (event: StorageEvent) => { if ([THEME_STORAGE_KEY, LEGACY_THEME_STORAGE_KEY].includes(event.key || '')) sync(); };
  const onMedia = () => { if (getStoredThemePreference() === 'system') sync(); };
  window.addEventListener(THEME_CHANGE_EVENT, sync);
  window.addEventListener('storage', onStorage);
  media.addEventListener('change', onMedia);
  sync();
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, sync);
    window.removeEventListener('storage', onStorage);
    media.removeEventListener('change', onMedia);
  };
}
