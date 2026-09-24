'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Clock, 
  FolderHeart, 
  Hash, 
  Plus, 
  X, 
  Sparkles,
  Layers,
  ChevronDown,
  ExternalLink,
  Trash2,
  Pencil,
  BarChart3,
  ArrowUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { getTagStyle } from '@/lib/colors';
import { PlatformItem } from '@/types/profile';
import { useTranslation } from 'react-i18next';
import { currentLanguage } from '@/i18n/format';

interface SidebarStats {
  total: number;
  favorites: number;
  later: number;
  trashCount: number;
  withWebsite: number;
  platforms: Record<string, number>;
  tags: Record<string, number>;
  collections: Record<string, number>;
}

interface TagInfo {
  id: string;
  name: string;
  color?: string;
  count?: number;
}

interface CollectionInfo {
  id: string;
  name: string;
  count?: number;
}

interface SidebarProps {
  stats: SidebarStats | null;
  platforms: PlatformItem[];
  activeNav: string;
  onSelectNav: (nav: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenNewProfile: () => void;
  onOpenNewPlatform: () => void;
  onAddCustomTag?: (tagName: string) => void;
  // Edit/Delete callbacks
  tagInfos?: TagInfo[];
  collectionInfos?: CollectionInfo[];
  onEditPlatform?: (platform: PlatformItem) => void;
  onDeletePlatform?: (platform: PlatformItem) => void;
  onEditTag?: (tag: TagInfo) => void;
  onDeleteTag?: (tag: TagInfo) => void;
  onEditCollection?: (col: CollectionInfo) => void;
  onDeleteCollection?: (col: CollectionInfo) => void;
  desktopWidth?: number;
  onDesktopWidthChange?: (width: number) => void;
  isDesktopCollapsed?: boolean;
  onToggleDesktopCollapsed?: () => void;
}

const SYSTEM_COLLECTIONS = ['favoriler', 'sonra bak'];
type SidebarSortMode = 'alpha' | 'count';

function SortSelect({ value, onChange, label }: { value: SidebarSortMode; onChange: (value: SidebarSortMode) => void; label: string }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  const choose = (nextValue: SidebarSortMode) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative min-w-0 shrink-0" title={t('sidebar.sortAria', { section: label })}>
      <button
        type="button"
        aria-label={t('sidebar.sortAria', { section: label })}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-7 max-w-full items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-[10px] font-medium normal-case tracking-normal text-slate-300 outline-none transition hover:border-slate-600 hover:text-white focus:border-pink-500"
      >
        <ArrowUpDown className="h-3 w-3 shrink-0" />
        <span className="truncate">{value === 'alpha' ? t('sidebar.sortAZ') : t('sidebar.sortCount')}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-28 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-slate-700 bg-slate-900 p-1 shadow-xl shadow-black/30"
        >
          {([['alpha', t('sidebar.sortAZ')], ['count', t('sidebar.sortCount')]] as const).map(([optionValue, optionLabel]) => (
            <button
              key={optionValue}
              type="button"
              role="menuitemradio"
              aria-checked={value === optionValue}
              onClick={() => choose(optionValue)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                value === optionValue ? 'bg-pink-500/15 text-pink-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {optionLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  stats,
  platforms,
  activeNav,
  onSelectNav,
  isOpenMobile,
  onCloseMobile,
  onOpenNewProfile,
  onOpenNewPlatform,
  onAddCustomTag,
  tagInfos = [],
  collectionInfos = [],
  onEditPlatform,
  onDeletePlatform,
  onEditTag,
  onDeleteTag,
  onEditCollection,
  onDeleteCollection,
  desktopWidth = 260,
  onDesktopWidthChange,
  isDesktopCollapsed = false,
  onToggleDesktopCollapsed,
}: SidebarProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLanguage(i18n.language) === 'tr' ? 'tr' : 'en';
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(true);
  const [collectionSort, setCollectionSort] = useState<SidebarSortMode>('alpha');
  const [tagSort, setTagSort] = useState<SidebarSortMode>('alpha');
  const [platformSort, setPlatformSort] = useState<SidebarSortMode>('alpha');
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);

  const handleResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizeStartRef.current = { pointerX: event.clientX, width: desktopWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add('select-none');
    document.body.style.cursor = 'col-resize';
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = resizeStartRef.current;
    if (!start) return;
    const nextWidth = Math.min(400, Math.max(220, start.width + event.clientX - start.pointerX));
    onDesktopWidthChange?.(nextWidth);
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizeStartRef.current) return;
    resizeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.classList.remove('select-none');
    document.body.style.cursor = '';
  };

  useEffect(() => {
    const readSort = (key: string, legacyKey: string): SidebarSortMode => (localStorage.getItem(key) ?? localStorage.getItem(legacyKey)) === 'count' ? 'count' : 'alpha';
    setCollectionSort(readSort('finddex-sidebar-sort-collections', 'modelvault-sidebar-sort-collections'));
    setTagSort(readSort('finddex-sidebar-sort-tags', 'modelvault-sidebar-sort-tags'));
    setPlatformSort(readSort('finddex-sidebar-sort-platforms', 'modelvault-sidebar-sort-platforms'));
  }, []);

  const updateSort = (key: string, setter: React.Dispatch<React.SetStateAction<SidebarSortMode>>, value: SidebarSortMode) => {
    setter(value);
    localStorage.setItem(key, value);
  };

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagInput.trim() && onAddCustomTag) {
      onAddCustomTag(newTagInput.trim());
      setNewTagInput('');
      setShowAddTag(false);
    }
  };

  const totalCount = stats?.total || 0;
  const trashCount = stats?.trashCount || 0;
  const progressPercent = Math.min(100, Math.round((totalCount / 30) * 100));

  // Build a map from tag name to id for quick lookup.
  const tagIdMap: Record<string, string> = {};
  tagInfos.forEach((t) => { tagIdMap[t.name] = t.id; });
  const tagInfoMap = Object.fromEntries(tagInfos.map((tag) => [tag.name, tag]));

  const colIdMap: Record<string, string> = {};
  collectionInfos.forEach((c) => { colIdMap[c.name] = c.id; });

  const sortedCollections = useMemo(() => [...collectionInfos].sort((left, right) => {
    const leftCount = stats?.collections[left.name] ?? left.count ?? 0;
    const rightCount = stats?.collections[right.name] ?? right.count ?? 0;
    return collectionSort === 'count'
      ? rightCount - leftCount || left.name.localeCompare(right.name, locale)
      : left.name.localeCompare(right.name, locale);
  }), [collectionInfos, collectionSort, stats, locale]);

  const sortedTags = useMemo(() => [...tagInfos].sort((left, right) => {
    const leftCount = stats?.tags[left.name] ?? left.count ?? 0;
    const rightCount = stats?.tags[right.name] ?? right.count ?? 0;
    return tagSort === 'count'
      ? rightCount - leftCount || left.name.localeCompare(right.name, locale)
      : left.name.localeCompare(right.name, locale);
  }), [tagInfos, tagSort, stats, locale]);

  const sortedPlatforms = useMemo(() => [...platforms].sort((left, right) => {
    const leftCount = left.count ?? stats?.platforms[left.key] ?? 0;
    const rightCount = right.count ?? stats?.platforms[right.key] ?? 0;
    return platformSort === 'count'
      ? rightCount - leftCount || left.name.localeCompare(right.name, locale)
      : left.name.localeCompare(right.name, locale);
  }), [platforms, platformSort, stats, locale]);

  const content = (
    <div className="flex h-full min-w-0 flex-col overflow-x-hidden bg-[#0a0e17] dark:bg-[#0a0e17] border-r border-[#1f293d] select-none text-slate-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1f293d]/80 flex min-w-0 items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20 text-white font-bold text-lg">
            FD
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate font-extrabold text-lg text-white tracking-tight">{t('brand.name')}</h1>
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            </div>
            <p className="truncate text-xs text-slate-400 font-medium tracking-wide">{t('brand.tagline')}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onToggleDesktopCollapsed}
            className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:block"
            aria-label={t('sidebar.hide')}
            title={t('sidebar.hide')}
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Navigation Area */}
      <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-thin">
        {/* Main Navigation */}
        <div className="space-y-1">
          <button
            onClick={() => { onSelectNav('all'); onCloseMobile(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeNav === 'all'
                ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-pink-400 border border-pink-500/30 font-semibold'
                : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-pink-400" />
              <span>{t('sidebar.all')}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700/60">
              {stats?.total ?? 0}
            </span>
          </button>

          <button
            onClick={() => { onSelectNav('favorites'); onCloseMobile(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeNav === 'favorites'
                ? 'bg-gradient-to-r from-pink-500/15 to-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold'
                : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              <span>{t('sidebar.favorites')}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-rose-300 font-semibold border border-slate-700/60">
              {stats?.favorites ?? 0}
            </span>
          </button>

          <button
            onClick={() => { onSelectNav('later'); onCloseMobile(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeNav === 'later'
                ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{t('sidebar.watchLater')}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-semibold border border-slate-700/60">
              {stats?.later ?? 0}
            </span>
          </button>

          {/* Trash */}
          <button
            onClick={() => { onSelectNav('trash'); onCloseMobile(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeNav === 'trash'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>{t('sidebar.trash')}</span>
            </div>
            {trashCount > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                {trashCount}
              </span>
            ) : (
              <span className="text-xs text-slate-600 font-mono">0</span>
            )}
          </button>

          <Link
            href="/stats"
            onClick={onCloseMobile}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-sky-300 hover:bg-slate-800/60 transition"
          >
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span>{t('nav.statistics')}</span>
          </Link>

          <Link
            href="/settings"
            onClick={onCloseMobile}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-pink-300 hover:bg-slate-800/60 transition"
          >
            <Settings className="w-4 h-4 text-pink-400" />
            <span>{t('nav.settings')}</span>
          </Link>

          {/* Collections Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between px-3.5 py-2">
              <button
                onClick={() => setIsCollectionsExpanded(!isCollectionsExpanded)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition"
              >
              <div className="flex items-center gap-2">
                <FolderHeart className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('sidebar.collections')}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isCollectionsExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
              </button>
              <SortSelect value={collectionSort} onChange={(value) => updateSort('finddex-sidebar-sort-collections', setCollectionSort, value)} label={t('settings.collection')} />
            </div>

            {isCollectionsExpanded && (
              <div className="sidebar-sublist mt-1 ml-3 pl-0.5 pr-1 space-y-0.5">
                {sortedCollections.map((collection) => {
                  const collName = collection.name;
                  const count = stats?.collections[collName] ?? collection.count ?? 0;
                  const navKey = `collection:${collName}`;
                  const isSelected = activeNav === navKey;
                  const isSystemCol = SYSTEM_COLLECTIONS.includes(collName.toLowerCase());
                  const colId = colIdMap[collName];
                  return (
                    <div key={collName} className="group relative flex items-center">
                      <button
                        onClick={() => { onSelectNav(isSelected ? 'all' : navKey); onCloseMobile(); }}
                        className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-300 font-medium'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="truncate">{
                          ['favoriler', 'favorites'].includes(collName.toLowerCase())
                            ? t('sidebar.favorites')
                            : ['sonra bak', 'watch later'].includes(collName.toLowerCase())
                              ? t('sidebar.watchLater')
                              : collName
                        }</span>
                        <span className="text-[11px] text-slate-500 font-mono">{count}</span>
                      </button>
                      {/* Edit/Delete buttons (only for non-system collections) */}
                      {!isSystemCol && colId && (
                        <div className="absolute right-0 top-0 bottom-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition pr-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditCollection?.({ id: colId, name: collName, count }); }}
                            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-purple-400 transition"
                            title={t('sidebar.editCollection')}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteCollection?.({ id: colId, name: collName, count }); }}
                            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-rose-400 transition"
                            title={t('sidebar.deleteCollection')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Hash className="w-3.5 h-3.5 text-pink-400" />
              <span>{t('sidebar.tags')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SortSelect value={tagSort} onChange={(value) => updateSort('finddex-sidebar-sort-tags', setTagSort, value)} label={t('settings.tag')} />
              <button
                onClick={() => setShowAddTag(!showAddTag)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-pink-400 transition"
                title={t('sidebar.newTag')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showAddTag && (
            <form onSubmit={handleAddTagSubmit} className="mb-2 px-2">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder={t('sidebar.tagPlaceholder')}
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-1.5 bg-pink-500 text-white rounded-lg text-xs font-semibold hover:bg-pink-600"
                >
                  {t('common.add')}
                </button>
              </div>
            </form>
          )}

          <div className="sidebar-sublist space-y-0.5 pr-1">
            {tagInfos.length > 0 ? (
              sortedTags.map((tagInfo) => {
                const tag = tagInfo.name;
                const count = stats?.tags[tag] ?? tagInfo.count ?? 0;
                const navKey = `tag:${tag}`;
                const isSelected = activeNav === navKey;
                const style = getTagStyle(tag, tagInfoMap[tag]?.color);
                const tagId = tagIdMap[tag];
                return (
                  <div key={tag} className="group relative flex items-center">
                    <button
                      onClick={() => { onSelectNav(isSelected ? 'all' : navKey); onCloseMobile(); }}
                      className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                        isSelected
                          ? 'bg-slate-800 text-white font-medium shadow-sm border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
                        <span className="truncate">{tag}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">{count}</span>
                    </button>
                    {/* Edit/Delete buttons for tags */}
                    {tagId && (
                      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition pr-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditTag?.({ id: tagId, name: tag, color: tagInfoMap[tag]?.color, count }); }}
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-pink-400 transition"
                          title={t('sidebar.editTag')}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteTag?.({ id: tagId, name: tag, count }); }}
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-rose-400 transition"
                          title={t('sidebar.deleteTag')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="px-3 text-xs text-slate-500">{t('sidebar.noTags')}</p>
            )}
          </div>
        </div>

        {/* Dynamic Platforms Section */}
        <div>
          <div className="px-3 mb-2.5 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('sidebar.platforms')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SortSelect value={platformSort} onChange={(value) => updateSort('finddex-sidebar-sort-platforms', setPlatformSort, value)} label="Platform" />
              <button
                onClick={onOpenNewPlatform}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                title={t('sidebar.newPlatform')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="sidebar-sublist space-y-0.5 pr-1">
            {sortedPlatforms.map((p) => {
              const count = p.count ?? stats?.platforms[p.key] ?? 0;
              const navKey = `platform:${p.key}`;
              const isSelected = activeNav === navKey;
              return (
                <div key={p.key} className="group relative flex items-center">
                  <button
                    onClick={() => { onSelectNav(isSelected ? 'all' : navKey); onCloseMobile(); }}
                    className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
                      isSelected
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <PlatformIcon platform={p.key} iconName={p.icon} className="w-4 h-4 shrink-0" />
                      <span className="truncate">{p.name}</span>
                      {p.isCustom && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                          {t('sidebar.custom')}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                      {count}
                    </span>
                  </button>
                  {/* Edit/Delete buttons (only for custom platforms) */}
                  {p.isCustom && (
                    <div className="absolute right-0 top-0 bottom-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition pr-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditPlatform?.(p); }}
                        className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-cyan-400 transition"
                        title={t('sidebar.editPlatform')}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePlatform?.(p); }}
                        className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-rose-400 transition"
                        title={t('sidebar.deletePlatform')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Profile Summary Card */}
      <div className="p-3.5 border-t border-[#1f293d] bg-[#0c111c]">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-[#141b2c] border border-slate-200 dark:border-slate-800/80 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>{t('sidebar.totalProfiles')}</span>
            </div>
            <span className="text-sm font-bold text-white font-mono">{totalCount}</span>
          </div>

          {/* Gradient progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-tight">
            {totalCount < 10
              ? t('sidebar.growArchive')
              : t('sidebar.greatCollection')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside
        className={`group/sidebar relative hidden h-screen shrink-0 overflow-x-hidden transition-[width,opacity] duration-300 ease-out lg:block sticky top-0 z-30 ${isDesktopCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        style={{ width: isDesktopCollapsed ? 0 : desktopWidth }}
      >
        {content}
        {!isDesktopCollapsed && (
          <button
            type="button"
            aria-label={t('sidebar.resize')}
            title={t('sidebar.resizeHint')}
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute inset-y-0 right-0 z-40 w-1.5 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-pink-500/60 focus:bg-pink-500/60 focus:outline-none group-hover/sidebar:bg-slate-600/30"
          />
        )}
      </aside>

      {isDesktopCollapsed && (
        <button
          type="button"
          onClick={onToggleDesktopCollapsed}
          className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 rounded-r-xl border border-l-0 border-slate-700 bg-slate-900/95 p-2.5 text-slate-300 shadow-xl backdrop-blur transition hover:bg-slate-800 hover:text-pink-300 lg:flex"
          aria-label={t('sidebar.show')}
          title={t('sidebar.show')}
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      {/* Mobile/Tablet drawer overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-[280px] max-w-[85vw] h-full shadow-2xl z-10 animate-fade-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
