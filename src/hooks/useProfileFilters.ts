'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY_FILTERS, hasActiveFilters, navKeyForFilters, ProfileFilters, sanitizeFilters, TagMode } from '@/lib/profileFilters';
import { WATCH_LATER_COLLECTION } from '@/lib/systemCollections';
import type { SortOption } from '@/types/profile';

export type ArchiveView = 'archive' | 'trash';

/** Owns every filter the archive can be narrowed by, plus the archive/trash switch. */
export function useProfileFilters() {
  const [filters, setFilters] = useState<ProfileFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<ArchiveView>('archive');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  const patch = useCallback((changes: Partial<ProfileFilters>) => {
    setFilters((current) => ({ ...current, ...changes }));
  }, []);

  /** Filters as sent to the API (search is debounced). */
  const queryFilters = useMemo<ProfileFilters>(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);
  const activeNav = view === 'trash' ? 'trash' : navKeyForFilters(filters);

  const selectNav = useCallback((navKey: string) => {
    if (navKey === 'trash') { setView('trash'); return; }
    setView('archive');
    if (navKey === 'all') patch({ tab: 'all', tags: [], collection: null });
    else if (navKey === 'favorites') patch({ tab: 'favorites', tags: [], collection: null });
    else if (navKey === 'later') patch({ tab: 'all', tags: [], collection: WATCH_LATER_COLLECTION });
    else if (navKey.startsWith('collection:')) patch({ tab: 'all', collection: navKey.slice('collection:'.length) });
    else if (navKey.startsWith('platform:')) patch({ tab: navKey.slice('platform:'.length), tags: [], collection: null });
  }, [patch]);

  const selectTab = useCallback((tab: string) => {
    setView('archive');
    patch({ tab });
  }, [patch]);

  const addTag = useCallback((name: string) => {
    setView('archive');
    setFilters((current) => current.tags.includes(name) ? current : { ...current, tags: [...current.tags, name] });
  }, []);
  const removeTag = useCallback((name: string) => {
    setFilters((current) => ({ ...current, tags: current.tags.filter((tag) => tag !== name) }));
  }, []);
  const toggleTag = useCallback((name: string) => {
    setView('archive');
    setFilters((current) => ({
      ...current,
      tags: current.tags.includes(name) ? current.tags.filter((tag) => tag !== name) : [...current.tags, name],
    }));
  }, []);

  // Every function returned here must keep a stable identity: callers list them as effect
  // dependencies (page.tsx applies the saved defaults through setSort), and a new function on
  // each render would re-run those effects forever.
  const setSearch = useCallback((search: string) => patch({ search }), [patch]);
  const setSort = useCallback((sort: SortOption) => patch({ sort }), [patch]);
  const setTagMode = useCallback((tagMode: TagMode) => patch({ tagMode }), [patch]);
  const clearTags = useCallback(() => patch({ tags: [] }), [patch]);
  const clearCollection = useCallback(() => patch({ collection: null }), [patch]);
  /** Clears every narrowing filter and the search; the sort order is kept. */
  const clearAll = useCallback(() => setFilters((current) => ({ ...EMPTY_FILTERS, sort: current.sort })), []);
  const applySaved = useCallback((saved: unknown) => { setView('archive'); setFilters(sanitizeFilters(saved)); }, []);

  return {
    filters,
    queryFilters,
    view,
    activeNav,
    hasActiveFilters: hasActiveFilters(filters),
    setView,
    selectNav,
    selectTab,
    addTag,
    removeTag,
    toggleTag,
    setSearch,
    setSort,
    setTagMode,
    clearTags,
    clearCollection,
    clearAll,
    applySaved,
  };
}
