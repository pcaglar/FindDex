'use client';

import { useCallback, useEffect, useState } from 'react';
import { applyThemePreference, watchTheme } from '@/lib/theme';

export function useThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => watchTheme((theme) => setIsDark(theme === 'dark')), []);
  const toggle = useCallback(() => {
    setIsDark((previous) => {
      const next = !previous;
      applyThemePreference(next ? 'dark' : 'light');
      return next;
    });
  }, []);
  return { isDark, toggle };
}
