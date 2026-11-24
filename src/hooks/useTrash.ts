'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '@/types/profile';

const INITIAL = { page: 1, pageSize: 12, total: 0, totalPages: 1 };

/** The Trash list (paginated) and the actions that change it. */
export function useTrash(onChanged: () => Promise<void> | void) {
  const [trashedProfiles, setTrashedProfiles] = useState<Profile[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(INITIAL);

  const fetchTrash = useCallback(async () => {
    try {
      const res = await fetch(`/api/trash?page=${page}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) return;
      // The last page can disappear after deletes or restores; step back to the new last page.
      if (page > data.pagination.totalPages) { setPage(data.pagination.totalPages); return; }
      setTrashedProfiles(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load trash:', err);
    }
  }, [page]);

  useEffect(() => { void fetchTrash(); }, [fetchTrash]);

  // Expired trash is purged explicitly (and nightly by the scheduler), never as a side effect of reading stats.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/maintenance/trash', { method: 'POST' })
      .then((res) => res.json())
      .then((result) => {
        if (!cancelled && result?.success && result.data?.deleted > 0) { void fetchTrash(); void onChanged(); }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const call = async (url: string, init: RequestInit) => {
    try {
      const res = await fetch(url, init);
      return await res.json();
    } catch (err) {
      console.error('Trash request failed:', err);
      return { success: false };
    }
  };

  const restore = async (id: string) => {
    if ((await call(`/api/trash/${id}`, { method: 'POST' })).success) return true;
    return false;
  };
  const deleteForever = async (id: string) => (await call(`/api/trash/${id}`, { method: 'DELETE' })).success === true;
  const empty = async () => {
    const result = await call('/api/trash', { method: 'DELETE' });
    if (result.success) {
      setTrashedProfiles([]);
      setPagination({ ...INITIAL });
      setPage(1);
    }
    return result.success === true;
  };
  const bulk = async (action: 'restore' | 'delete', ids: string[]) => {
    const result = await call('/api/trash/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, action }) });
    return result.success ? (result.data.affected as number) : null;
  };

  return { trashedProfiles, setTrashedProfiles, page, setPage, pagination, fetchTrash, restore, deleteForever, empty, bulk };
}
