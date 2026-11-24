'use client';

import { useCallback, useEffect, useState } from 'react';
import { PREFERENCE_CHANGE_EVENT, readPreference, SIDEBAR_COLLAPSED_KEY, SIDEBAR_WIDTH_KEY } from '@/lib/preferences';

const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 220;
const MAX_WIDTH = 400;

/** Sidebar width/collapsed state (persisted in the browser) and the mobile drawer. */
export function useSidebarLayout() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const savedWidth = Number(readPreference(SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) setWidth(savedWidth);
    setCollapsed(readPreference(SIDEBAR_COLLAPSED_KEY) === 'true');
    const syncReset = (event: Event) => {
      if ((event as CustomEvent).detail?.sidebarReset) { setWidth(DEFAULT_WIDTH); setCollapsed(false); }
    };
    window.addEventListener(PREFERENCE_CHANGE_EVENT, syncReset);
    return () => window.removeEventListener(PREFERENCE_CHANGE_EVENT, syncReset);
  }, []);

  const changeWidth = useCallback((next: number) => {
    const safeWidth = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
    setWidth(safeWidth);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(safeWidth));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  return { width, collapsed, mobileOpen, setMobileOpen, changeWidth, toggleCollapsed };
}
