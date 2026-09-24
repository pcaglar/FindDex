'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Grid, 
  List, 
  ArrowUpDown, 
  Heart, 
  Globe, 
  X
} from 'lucide-react';
import { SortOption, PlatformItem } from '@/types/profile';
import { PlatformIcon } from './PlatformIcon';

interface FilterBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  activeTag: string | null;
  onClearTag: () => void;
  activeCollection: string | null;
  onClearCollection: () => void;
  resultCount: number;
  platforms?: PlatformItem[];
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
}

export function FilterBar({
  currentTab,
  onSelectTab,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  activeTag,
  onClearTag,
  activeCollection,
  onClearCollection,
  resultCount,
  platforms = [],
  pageSize,
  onPageSizeChange,
}: FilterBarProps) {
  const { t } = useTranslation();
  // Built-in tabs
  const defaultTabs = [
    { key: 'all', label: t('filters.all') },
    { key: 'favorites', label: t('filters.favorites'), icon: <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> },
    { key: 'hasWebsite', label: t('filters.hasWebsite'), icon: <Globe className="w-3.5 h-3.5 text-cyan-400" /> },
  ];

  // Platform tabs from database
  const platformTabs = platforms.map((p) => ({
    key: p.key,
    label: p.name,
    platform: p.key,
    iconName: p.icon,
  }));

  const allTabs = [
    defaultTabs[0],
    ...platformTabs,
    defaultTabs[1],
    defaultTabs[2],
  ];

  return (
    <div className="space-y-2 mb-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-[#1f293d]/80 pb-3">
        {/* Horizontal scrollable tabs container */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none scroll-smooth">
          {allTabs.map((tab: any) => {
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onSelectTab(tab.key)}
                className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 border border-pink-500/40 shadow-sm'
                    : 'bg-[#111827] text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-[#1f293d]'
                }`}
              >
                {tab.platform && (
                  <PlatformIcon platform={tab.platform} iconName={tab.iconName} className="w-3.5 h-3.5" />
                )}
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side controls: Sorting dropdown & Grid/List view toggle */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0">
          <div className="text-xs text-slate-400 font-mono hidden xl:block">
            {t('filters.profiles', { count: resultCount })}
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <div className="absolute left-2.5 pointer-events-none text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="pl-8 pr-7 py-1.5 rounded-xl bg-[#111827] border border-[#1f293d] text-xs text-slate-300 focus:outline-none focus:border-pink-500 appearance-none cursor-pointer hover:bg-slate-800/60 transition"
            >
              <option value="newest">{t('filters.newest')}</option>
              <option value="oldest">{t('filters.oldest')}</option>
              <option value="name-asc">{t('filters.nameAZ')}</option>
              <option value="name-desc">{t('filters.nameZA')}</option>
              <option value="favorites">{t('filters.favoritesFirst')}</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="hidden 2xl:inline">{t('filters.perPage')}:</span>
            <span className="2xl:hidden">{t('filters.count')}</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:border-pink-400 focus:border-pink-500 dark:border-[#1f293d] dark:bg-[#111827] dark:text-slate-300"
              aria-label={t('filters.perPageAria')}
            >
              {[8, 12, 16, 24, 48].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>

          {/* View Toggle */}
          <div className="flex items-center bg-[#111827] border border-[#1f293d] rounded-xl p-0.5">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-pink-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t('filters.grid')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-pink-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t('filters.list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {(activeTag || activeCollection) && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">{t('filters.active')}</span>
          {activeTag && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-pink-500/15 text-pink-300 border border-pink-500/30">
              <span>#{activeTag}</span>
              <button onClick={onClearTag} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeCollection && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <span>📁 {activeCollection}</span>
              <button onClick={onClearCollection} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
