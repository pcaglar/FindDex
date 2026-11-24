'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Profile } from '@/types/profile';
import { filtersToSearchParams, ProfileFilters } from '@/lib/profileFilters';

const INITIAL_PAGINATION = { page: 1, pageSize: 16, total: 0, totalPages: 1 };

/** Loads one page of profiles for the given filters and keeps it in sync. */
export function useProfilesData(filters: ProfileFilters, pageSize: number) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const latestRequest = useRef(0);

  const filtersKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filtersKey]);

  useEffect(() => { setPage(1); }, [filtersKey, pageSize]);

  const fetchProfiles = useCallback(async (silent = false) => {
    const requestId = ++latestRequest.current;
    try {
      if (!silent) setLoading(true);
      const params = filtersToSearchParams(stableFilters, { page, pageSize });
      const res = await fetch(`/api/profiles?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (requestId !== latestRequest.current) return; // a newer request superseded this one
      if (data.success) {
        if (page > data.pagination.totalPages) {
          setPage(data.pagination.totalPages);
          return;
        }
        setProfiles(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      if (!silent && requestId === latestRequest.current) setLoading(false);
    }
  }, [stableFilters, page, pageSize]);

  useEffect(() => { void fetchProfiles(); }, [fetchProfiles]);

  return { profiles, setProfiles, pagination, loading, page, setPage, fetchProfiles };
}
