import type { SortOption } from '@/types/profile';
import { WATCH_LATER_COLLECTION } from '@/lib/systemCollections';

// Filter state shared by the UI, the /api/profiles query string and saved filters.
// This module must stay free of server-only imports: it also runs in the browser.
export type TagMode = 'all' | 'any';

export interface ProfileFilters {
  search: string;
  /** 'all', 'favorites', 'hasWebsite' or a platform key. */
  tab: string;
  tags: string[];
  tagMode: TagMode;
  collection: string | null;
  sort: SortOption;
}

export interface SavedFilterItem {
  id: string;
  name: string;
  filters: ProfileFilters;
  createdAt: string;
}

export const SORT_VALUES: SortOption[] = ['newest', 'oldest', 'name-asc', 'name-desc', 'favorites'];
export const MAX_FILTER_TAGS = 20;

export const EMPTY_FILTERS: ProfileFilters = {
  search: '',
  tab: 'all',
  tags: [],
  tagMode: 'all',
  collection: null,
  sort: 'newest',
};

const asString = (value: unknown, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Accepts anything (saved JSON, query strings, old versions) and returns a valid filter object. */
export function sanitizeFilters(input: unknown): ProfileFilters {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const uniqueTags = Array.from(new Set(tags.map((tag) => asString(tag)).filter(Boolean))).slice(0, MAX_FILTER_TAGS);
  const sort = SORT_VALUES.includes(raw.sort as SortOption) ? (raw.sort as SortOption) : EMPTY_FILTERS.sort;
  return {
    search: asString(raw.search),
    tab: asString(raw.tab, 100) || 'all',
    tags: uniqueTags,
    tagMode: raw.tagMode === 'any' ? 'any' : 'all',
    collection: asString(raw.collection) || null,
    sort,
  };
}

/** True when anything other than the sort order narrows the list. */
export function hasActiveFilters(filters: ProfileFilters) {
  return Boolean(filters.search.trim() || filters.tab !== 'all' || filters.tags.length || filters.collection);
}

export function filtersToSearchParams(filters: ProfileFilters, paging: { page: number; pageSize: number }) {
  const params = new URLSearchParams({ page: String(paging.page), pageSize: String(paging.pageSize), sort: filters.sort });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  filters.tags.forEach((tag) => params.append('tag', tag));
  if (filters.tags.length > 1) params.set('tagMode', filters.tagMode);
  if (filters.collection) params.set('collection', filters.collection);
  if (filters.tab === 'favorites' || filters.tab === 'hasWebsite') params.set('filter', filters.tab);
  else if (filters.tab !== 'all') params.set('platform', filters.tab);
  return params;
}

/** The sidebar entry that matches the filters ('all', 'favorites', 'later', 'collection:X', 'platform:X'). */
export function navKeyForFilters(filters: ProfileFilters) {
  if (filters.collection === WATCH_LATER_COLLECTION && filters.tab === 'all' && !filters.tags.length) return 'later';
  if (filters.collection) return `collection:${filters.collection}`;
  if (filters.tab === 'favorites') return 'favorites';
  if (filters.tab !== 'all' && filters.tab !== 'hasWebsite') return `platform:${filters.tab}`;
  return 'all';
}
