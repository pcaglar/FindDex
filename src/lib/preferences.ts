import type { SortOption } from '@/types/profile';

export const DEFAULT_VIEW_KEY = 'finddex-default-view';
export const DEFAULT_PAGE_SIZE_KEY = 'finddex-default-page-size';
export const DEFAULT_SORT_KEY = 'finddex-default-sort';
export const SIDEBAR_WIDTH_KEY = 'finddex-sidebar-width';
export const SIDEBAR_COLLAPSED_KEY = 'finddex-sidebar-collapsed';
export const PREFERENCE_CHANGE_EVENT = 'finddex-preferences-change';
const LEGACY_KEYS: Record<string, string> = {
  [DEFAULT_VIEW_KEY]: 'modelvault-default-view',
  [DEFAULT_PAGE_SIZE_KEY]: 'modelvault-default-page-size',
  [DEFAULT_SORT_KEY]: 'modelvault-default-sort',
  [SIDEBAR_WIDTH_KEY]: 'modelvault-sidebar-width',
  [SIDEBAR_COLLAPSED_KEY]: 'modelvault-sidebar-collapsed',
};

export function readPreference(key: string) {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const legacy = LEGACY_KEYS[key] ? localStorage.getItem(LEGACY_KEYS[key]) : null;
  if (legacy !== null) localStorage.setItem(key, legacy);
  return legacy;
}
export const PAGE_SIZE_OPTIONS = [8, 12, 16, 24, 48] as const;
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' },
  { value: 'name-asc', label: 'A-Z' }, { value: 'name-desc', label: 'Z-A' },
  { value: 'favorites', label: 'Favorites First' },
];

export function readHomeDefaults() {
  if (typeof window === 'undefined') return { viewMode: 'grid' as const, pageSize: 16, sortBy: 'newest' as SortOption };
  const view = readPreference(DEFAULT_VIEW_KEY);
  const size = Number(readPreference(DEFAULT_PAGE_SIZE_KEY));
  const sort = readPreference(DEFAULT_SORT_KEY) as SortOption | null;
  return {
    viewMode: view === 'list' ? 'list' as const : 'grid' as const,
    pageSize: PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number]) ? size : 16,
    sortBy: SORT_OPTIONS.some((option) => option.value === sort) ? sort! : 'newest' as SortOption,
  };
}

export function resetSidebarPreferences() {
  localStorage.setItem(SIDEBAR_WIDTH_KEY, '260');
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'false');
  window.dispatchEvent(new CustomEvent(PREFERENCE_CHANGE_EVENT, { detail: { sidebarReset: true } }));
}
