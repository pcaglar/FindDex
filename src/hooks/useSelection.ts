'use client';

import { useCallback, useState } from 'react';

/** Multi-select state for the bulk action bar. */
export function useSelection() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const addMany = useCallback((ids: string[]) => setSelected((current) => new Set([...current, ...ids])), []);
  const clear = useCallback(() => setSelected(new Set()), []);
  const exit = useCallback(() => { setSelected(new Set()); setSelectionMode(false); }, []);

  return { selectionMode, setSelectionMode, selected, toggle, addMany, clear, exit };
}
