'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlatformItem } from '@/types/profile';
import type { SavedFilterItem } from '@/lib/profileFilters';

export interface SidebarStatsData {
  total: number;
  favorites: number;
  later: number;
  trashCount: number;
  withWebsite: number;
  platforms: Record<string, number>;
  tags: Record<string, number>;
  collections: Record<string, number>;
}
export interface TagInfo { id: string; name: string; color?: string; count?: number }
export interface CollectionInfo { id: string; name: string; count?: number }

async function load<T>(url: string, apply: (data: T) => void, label: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (data.success) apply(data.data);
  } catch (err) {
    console.error(`Failed to load ${label}:`, err);
  }
}

/** Everything the sidebar lists: platforms, tags, collections, saved filters and the counters. */
export function useCatalog() {
  const [stats, setStats] = useState<SidebarStatsData | null>(null);
  const [platforms, setPlatforms] = useState<PlatformItem[]>([]);
  const [tagInfos, setTagInfos] = useState<TagInfo[]>([]);
  const [collectionInfos, setCollectionInfos] = useState<CollectionInfo[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilterItem[]>([]);

  const fetchStats = useCallback(() => load<SidebarStatsData>('/api/stats', setStats, 'stats'), []);
  const fetchPlatforms = useCallback(() => load<PlatformItem[]>('/api/platforms', setPlatforms, 'platforms'), []);
  const fetchTags = useCallback(() => load<TagInfo[]>('/api/tags', setTagInfos, 'tags'), []);
  const fetchCollections = useCallback(() => load<CollectionInfo[]>('/api/collections', setCollectionInfos, 'collections'), []);
  const fetchSavedFilters = useCallback(() => load<SavedFilterItem[]>('/api/saved-filters', setSavedFilters, 'saved filters'), []);

  const refreshSidebarData = useCallback(async () => {
    await Promise.all([fetchStats(), fetchPlatforms(), fetchTags(), fetchCollections(), fetchSavedFilters()]);
  }, [fetchCollections, fetchPlatforms, fetchSavedFilters, fetchStats, fetchTags]);

  useEffect(() => { void refreshSidebarData(); }, [refreshSidebarData]);

  return {
    stats, platforms, setPlatforms, tagInfos, collectionInfos, savedFilters,
    fetchStats, fetchTags, fetchSavedFilters, refreshSidebarData,
  };
}
