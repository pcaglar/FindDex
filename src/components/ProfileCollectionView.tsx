'use client';

import React from 'react';
import { Plus, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Profile } from '@/types/profile';
import { ProfileCard } from './ProfileCard';
import { ProfileListItem } from './ProfileListItem';
import { PaginationControls } from './PaginationControls';

interface ProfileCollectionViewProps {
  profiles: Profile[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onOpen: (profile: Profile) => void;
  onToggleFavorite: (profileId: string) => void;
  onToggleCollection: (profileId: string, collection: string) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profileId: string) => void;
  onSelectTag: (tag: string) => void;
  onClearFilters: () => void;
  onCreate: () => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (profileId: string) => void;
}

/** Loading state, empty state, grid or list of profiles, and the pager. */
export function ProfileCollectionView(props: ProfileCollectionViewProps) {
  const { t } = useTranslation();
  const { profiles, loading, viewMode, pagination } = props;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-3" />
        <p className="text-xs">{t('home.loadingProfiles')}</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="py-16 px-4 rounded-3xl bg-[#111827]/50 border border-[#1f293d] flex flex-col items-center justify-center text-center max-w-md mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-pink-400 mb-4 shadow-lg">
          <SearchX className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">{t('home.noMatch')}</h3>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">{t('home.noMatchDescription')}</p>
        <div className="flex items-center gap-3">
          <button onClick={props.onClearFilters} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition">
            {t('home.clearFilters')}
          </button>
          <button onClick={props.onCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600 shadow-md shadow-pink-500/25 hover:from-pink-600 transition">
            <Plus className="w-4 h-4" />
            <span>{t('topbar.newProfile')}</span>
          </button>
        </div>
      </div>
    );
  }

  const shared = (profile: Profile) => ({
    profile,
    onClick: () => props.onOpen(profile),
    onToggleFavorite: (event: React.MouseEvent) => { event.stopPropagation(); props.onToggleFavorite(profile.id); },
    onToggleCollection: (event: React.MouseEvent, collection: string) => { event.stopPropagation(); props.onToggleCollection(profile.id, collection); },
    onEdit: () => props.onEdit(profile),
    onDelete: () => props.onDelete(profile.id),
    onSelectTag: props.onSelectTag,
    selectable: props.selectionMode,
    selected: props.selectedIds.has(profile.id),
    onToggleSelect: () => props.onToggleSelect(profile.id),
  });

  return (
    <>
      {viewMode === 'grid' ? (
        // 4 columns on desktop (>=1280px), 2-3 on tablet, 1 on mobile
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {profiles.map((profile) => <ProfileCard key={profile.id} {...shared(profile)} />)}
        </div>
      ) : (
        <div className="space-y-2.5">
          {profiles.map((profile) => <ProfileListItem key={profile.id} {...shared(profile)} />)}
        </div>
      )}
      <PaginationControls page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} totalPages={pagination.totalPages} onPageChange={props.onPageChange} />
    </>
  );
}
