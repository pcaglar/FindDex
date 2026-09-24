'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Plus, 
  Menu, 
  Sun, 
  Moon, 
  X,
  SlidersHorizontal 
} from 'lucide-react';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewProfile: () => void;
  onToggleSidebarMobile: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  onOpenNewProfile,
  onToggleSidebarMobile,
  isDark,
  onToggleTheme,
}: TopBarProps) {
  const { t } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K keyboard shortcut listener.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 w-full bg-white/85 dark:bg-[#0a0e17]/85 backdrop-blur-md border-b border-slate-200 dark:border-[#1f293d] px-4 lg:px-8 py-3.5 flex items-center justify-between gap-3">
      {/* Left section: mobile menu button and search input. */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
          aria-label={t('common.menu')}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search input with Ctrl+K */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-pink-400 transition">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('topbar.search')}
            className="w-full pl-10 pr-20 py-2 rounded-xl bg-[#111827] border border-[#1f293d] text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500/80 focus:ring-1 focus:ring-pink-500/50 transition shadow-inner"
          />

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700 rounded-md shadow-sm">
                <span>Ctrl</span>
                <span>K</span>
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Right section: Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Theme toggle button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 transition"
          title={isDark ? t('topbar.lightTheme') : t('topbar.darkTheme')}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        {/* Add New Profile button (Pink-Red Gradient) */}
        <button
          onClick={onOpenNewProfile}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-medium text-xs sm:text-sm shadow-md shadow-pink-500/25 active:scale-95 transition transform duration-150"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">{t('topbar.newProfile')}</span>
          <span className="sm:hidden">{t('common.add')}</span>
        </button>
      </div>
    </header>
  );
}
