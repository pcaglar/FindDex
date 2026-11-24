'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Grid, 
  List, 
  ArrowUpDown, 
  Heart, 
  Globe, 
  X,
  CheckSquare,
  BookmarkPlus
} from 'lucide-react';
import { SortOption, PlatformItem } from '@/types/profile';
import type { TagMode } from '@/lib/profileFilters';
import { systemCollectionLabelKey } from '@/lib/systemCollections';
import { PlatformIcon } from './PlatformIcon';

interface FilterBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  activeTags: string[];
  tagMode: TagMode;
  onTagModeChange: (mode: TagMode) => void;
  onRemoveTag: (tag: string) => void;
  activeCollection: string | null;
  onClearCollection: () => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
  /** Resolves true when the filter was saved. */
  onSaveFilter: (name: string) => Promise<boolean>;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
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
  activeTags,
  tagMode,
  onTagModeChange,
  onRemoveTag,
  activeCollection,
  onClearCollection,
  hasActiveFilters,
  onClearAll,
  onSaveFilter,
  selectionMode,
  onToggleSelectionMode,
  resultCount,
  platforms = [],
  pageSize,
  onPageSizeChange,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [showSave, setShowSave] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  const submitSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!filterName.trim() || saving) return;
    setSaving(true);
    setSaveError(false);
    const ok = await onSaveFilter(filterName.trim());
    setSaving(false);
    if (ok) { setShowSave(false); setFilterName(''); } else setSaveError(true);
  };
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

          <button
            type="button"
            onClick={onToggleSelectionMode}
            aria-pressed={selectionMode}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
              selectionMode
                ? 'border-pink-500/50 bg-pink-500/15 text-pink-300'
                : 'border-[#1f293d] bg-[#111827] text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{selectionMode ? t('bulk.done') : t('bulk.select')}</span>
          </button>

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
      {(activeTags.length > 0 || activeCollection || hasActiveFilters) && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">{t('filters.active')}</span>
          {activeTags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-pink-500/15 text-pink-300 border border-pink-500/30">
              <span>#{tag}</span>
              <button onClick={() => onRemoveTag(tag)} className="hover:text-white" aria-label={t('filters.removeTag', { name: tag })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {activeTags.length > 1 && (
            <div className="flex items-center rounded-lg border border-[#1f293d] bg-[#111827] p-0.5 text-[11px]" role="group" aria-label={t('filters.tagMode')}>
              {(['all', 'any'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onTagModeChange(mode)}
                  aria-pressed={tagMode === mode}
                  className={`rounded-md px-2 py-0.5 font-semibold transition ${tagMode === mode ? 'bg-pink-500/25 text-pink-200' : 'text-slate-400 hover:text-white'}`}
                >
                  {mode === 'all' ? t('filters.matchAll') : t('filters.matchAny')}
                </button>
              ))}
            </div>
          )}
          {activeCollection && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <span>📁 {systemCollectionLabelKey(activeCollection) ? t(systemCollectionLabelKey(activeCollection)!) : activeCollection}</span>
              <button onClick={onClearCollection} className="hover:text-white" aria-label={t('common.remove')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {hasActiveFilters && (
            <>
              <button type="button" onClick={onClearAll} className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-white hover:underline">
                {t('filters.clearAll')}
              </button>
              <button
                type="button"
                onClick={() => setShowSave((current) => !current)}
                aria-expanded={showSave}
                className="inline-flex items-center gap-1 rounded-lg border border-[#1f293d] bg-[#111827] px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('savedFilters.save')}</span>
              </button>
            </>
          )}
        </div>
      )}

      {showSave && hasActiveFilters && (
        <form onSubmit={submitSave} className="flex flex-wrap items-center gap-2 pt-1">
          <input
            autoFocus
            value={filterName}
            onChange={(event) => { setFilterName(event.target.value); setSaveError(false); }}
            maxLength={60}
            placeholder={t('savedFilters.namePlaceholder')}
            aria-label={t('savedFilters.namePlaceholder')}
            className="w-56 rounded-lg border border-[#1f293d] bg-[#151c2e] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none"
          />
          <button type="submit" disabled={!filterName.trim() || saving} className="rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-pink-600 disabled:opacity-50">
            {t('common.save')}
          </button>
          <button type="button" onClick={() => setShowSave(false)} className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-white">{t('common.cancel')}</button>
          <span className={`text-[11px] ${saveError ? 'text-rose-400' : 'text-slate-500'}`}>{saveError ? t('savedFilters.failed') : t('savedFilters.replaceHint')}</span>
        </form>
      )}
    </div>
  );
}
