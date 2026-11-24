'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Profile } from '@/types/profile';
import { readHomeDefaults } from '@/lib/preferences';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { FilterBar } from '@/components/FilterBar';
import { ProfileCollectionView } from '@/components/ProfileCollectionView';
import { ProfileDetailPanel } from '@/components/ProfileDetailPanel';
import { ProfileModal } from '@/components/ProfileModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { TrashView } from '@/components/TrashView';
import { BulkActionBar } from '@/components/BulkActionBar';
import { CatalogDialogs, useCatalogDialogs } from '@/components/CatalogDialogs';
import { useProfileFilters } from '@/hooks/useProfileFilters';
import { useProfilesData } from '@/hooks/useProfilesData';
import { useCatalog } from '@/hooks/useCatalog';
import { useTrash } from '@/hooks/useTrash';
import { useSelection } from '@/hooks/useSelection';
import { useSidebarLayout } from '@/hooks/useSidebarLayout';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import type { BulkAction } from '@/lib/bulkTypes';
import { useTranslation } from 'react-i18next';

const PAGE_SIZES = [8, 12, 16, 24, 48];
const json = { 'Content-Type': 'application/json' };

export default function HomePage() {
  const { t } = useTranslation();
  const contentTopRef = useRef<HTMLElement>(null);

  const [pageSize, setPageSize] = useState(16);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filterState = useProfileFilters();
  const catalog = useCatalog();
  const data = useProfilesData(filterState.queryFilters, pageSize);
  const trash = useTrash(catalog.refreshSidebarData);
  const selection = useSelection();
  const sidebar = useSidebarLayout();
  const theme = useThemeToggle();
  const dialogs = useCatalogDialogs();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Profile | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [confirmBulkTrash, setConfirmBulkTrash] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const { fetchProfiles, setProfiles, profiles } = data;
  const { setSort } = filterState;
  const { refreshSidebarData, fetchStats } = catalog;
  const { fetchTrash } = trash;

  useEffect(() => {
    const defaults = readHomeDefaults();
    setPageSize(defaults.pageSize);
    setViewMode(defaults.viewMode);
    setSort(defaults.sortBy);
  }, [setSort]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedProfile = useMemo(() => profiles.find((p) => p.id === selectedProfileId) || null, [profiles, selectedProfileId]);

  /** Reload the list, the Trash and every counter after something changed. */
  const refreshAfterChange = useCallback(async () => {
    await Promise.all([fetchProfiles(true), fetchTrash(), refreshSidebarData()]);
  }, [fetchProfiles, fetchTrash, refreshSidebarData]);

  const closeDetail = () => { setIsDetailOpen(false); setSelectedProfileId(null); };

  // ---- single-profile actions ----------------------------------------------------------
  const sendUpdate = async (profileId: string, patch: Partial<Profile>, failureMessage: string) => {
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, ...patch } : p))); // optimistic
    try {
      const response = await fetch(`/api/profiles/${profileId}`, { method: 'PUT', headers: json, body: JSON.stringify(patch) });
      if (!response.ok) throw new Error(failureMessage);
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
    } catch (err) {
      console.error(failureMessage, err);
      void fetchProfiles(true);
    }
  };

  const handleToggleFavorite = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) void sendUpdate(profileId, { isFavorite: !profile.isFavorite }, t('errors.favoriteUpdate'));
  };

  const handleToggleCollection = (profileId: string, collectionName: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const exists = profile.collections.some((c) => c.toLowerCase() === collectionName.toLowerCase());
    const collections = exists
      ? profile.collections.filter((c) => c.toLowerCase() !== collectionName.toLowerCase())
      : [...profile.collections, collectionName];
    void sendUpdate(profileId, { collections }, t('errors.collectionUpdate'));
  };

  const handleUpdateProfile = async (id: string, patch: Partial<Profile>) => {
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(patch) });
      const result = await res.json();
      if (result.success) {
        setProfiles((prev) => prev.map((p) => (p.id === id ? result.data : p)));
        await Promise.all([fetchProfiles(true), refreshSidebarData()]);
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      void fetchProfiles(true);
    }
  };

  const handleSaveModalProfile = async (formData: unknown) => {
    const editing = modalInitialData;
    const res = await fetch(editing ? `/api/profiles/${editing.id}` : '/api/profiles', {
      method: editing ? 'PUT' : 'POST', headers: json, body: JSON.stringify(formData),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      const error = new Error(result.error || t('profile.saveFailed')) as Error & { code?: string };
      error.code = result.code;
      throw error;
    }
    if (editing) {
      setProfiles((prev) => prev.map((profile) => profile.id === editing.id ? result.data : profile));
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
    } else {
      data.setPage(1);
      setProfiles((current) => [result.data, ...current.filter((profile) => profile.id !== result.data.id)].slice(0, pageSize));
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
      setSelectedProfileId(result.data.id);
      setIsDetailOpen(true);
    }
  };

  const handleConfirmSoftDelete = async () => {
    const id = deleteCandidateId;
    if (!id) return;
    setDeleteCandidateId(null);
    if (selectedProfileId === id) closeDetail();
    const removed = profiles.find((p) => p.id === id);
    if (removed) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      trash.setTrashedProfiles((prev) => [{ ...removed, deletedAt: new Date().toISOString() }, ...prev]);
    }
    try {
      await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to soft delete profile', err);
    }
    await refreshAfterChange();
  };

  // ---- Trash --------------------------------------------------------------------------
  const handleRestore = async (id: string) => { if (await trash.restore(id)) await refreshAfterChange(); };
  const handlePermanentDelete = async (id: string) => {
    if (await trash.deleteForever(id)) await Promise.all([fetchTrash(), refreshSidebarData()]);
  };
  const handleEmptyTrash = async () => { if (await trash.empty()) await refreshSidebarData(); };
  const handleBulkTrash = (action: 'restore' | 'delete') => async (ids: string[]) => {
    const affected = await trash.bulk(action, ids);
    setNotice(affected === null ? t('bulk.failed') : t(action === 'restore' ? 'bulk.restored' : 'bulk.deleted', { count: affected }));
    await refreshAfterChange();
  };

  // ---- Bulk actions on the archive ------------------------------------------------------
  const runBulk = async (action: BulkAction, values: { tags?: string[]; collections?: string[] } = {}) => {
    setBulkBusy(true);
    try {
      const res = await fetch('/api/profiles/bulk', { method: 'POST', headers: json, body: JSON.stringify({ ids: [...selection.selected], action, ...values }) });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || t('bulk.failed'));
      setNotice(result.data.affected ? t('bulk.updated', { count: result.data.affected }) : t('bulk.nothingChanged'));
      if (action === 'trash') {
        if (selectedProfileId && selection.selected.has(selectedProfileId)) closeDetail();
        selection.clear();
      }
      await refreshAfterChange();
    } catch (err) {
      console.error('Bulk action failed', err);
      setNotice(t('bulk.failed'));
    } finally {
      setBulkBusy(false);
    }
  };

  // ---- Saved filters --------------------------------------------------------------------
  const handleSaveFilter = async (name: string) => {
    try {
      const res = await fetch('/api/saved-filters', { method: 'POST', headers: json, body: JSON.stringify({ name, filters: filterState.filters }) });
      const result = await res.json();
      if (!res.ok || !result.success) return false;
      await catalog.fetchSavedFilters();
      return true;
    } catch {
      return false;
    }
  };
  const handleDeleteSavedFilter = async (filter: { id: string }) => {
    await fetch(`/api/saved-filters/${filter.id}`, { method: 'DELETE' });
    await catalog.fetchSavedFilters();
  };

  // ---- Sidebar / filter bar --------------------------------------------------------------
  const handleCreateTag = async (name: string) => {
    const response = await fetch('/api/tags', { method: 'POST', headers: json, body: JSON.stringify({ name }) });
    if ((await response.json()).success) {
      await Promise.all([catalog.fetchTags(), fetchStats(), fetchProfiles(true)]);
      filterState.addTag(name);
    }
  };

  const openEdit = (profile: Profile) => { setModalInitialData(profile); setIsModalOpen(true); };
  const openCreate = () => { setModalInitialData(null); setIsModalOpen(true); };
  const toggleSelectionMode = () => (selection.selectionMode ? selection.exit() : selection.setSelectionMode(true));

  const handlePageChange = (nextPage: number) => {
    const safePage = Math.min(Math.max(1, nextPage), data.pagination.totalPages);
    if (safePage === data.page) return;
    data.setPage(safePage);
    requestAnimationFrame(() => contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const inArchive = filterState.view === 'archive';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] flex text-slate-900 dark:text-slate-100">
      <Sidebar
        stats={catalog.stats}
        platforms={catalog.platforms}
        activeNav={filterState.activeNav}
        onSelectNav={filterState.selectNav}
        activeTags={filterState.filters.tags}
        onToggleTag={filterState.toggleTag}
        savedFilters={catalog.savedFilters}
        onApplySavedFilter={(saved) => filterState.applySaved(saved.filters)}
        onDeleteSavedFilter={dialogs.setDeleteSavedFilter}
        isOpenMobile={sidebar.mobileOpen}
        onCloseMobile={() => sidebar.setMobileOpen(false)}
        onOpenNewProfile={openCreate}
        onOpenNewPlatform={dialogs.openNewPlatform}
        onAddCustomTag={handleCreateTag}
        tagInfos={catalog.tagInfos}
        collectionInfos={catalog.collectionInfos}
        onEditPlatform={dialogs.openEditPlatform}
        onDeletePlatform={dialogs.setDeletePlatform}
        onEditTag={dialogs.setEditTag}
        onDeleteTag={dialogs.setDeleteTag}
        onEditCollection={dialogs.setEditCollection}
        onDeleteCollection={dialogs.setDeleteCollection}
        desktopWidth={sidebar.width}
        onDesktopWidthChange={sidebar.changeWidth}
        isDesktopCollapsed={sidebar.collapsed}
        onToggleDesktopCollapsed={sidebar.toggleCollapsed}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isDetailOpen ? 'lg:mr-[420px]' : ''}`}>
        <TopBar
          searchQuery={filterState.filters.search}
          onSearchChange={filterState.setSearch}
          onOpenNewProfile={openCreate}
          onToggleSidebarMobile={() => sidebar.setMobileOpen(true)}
          isDark={theme.isDark}
          onToggleTheme={theme.toggle}
        />

        <main ref={contentTopRef} className={`flex-1 scroll-mt-20 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto ${selection.selectionMode && inArchive ? 'pb-32' : ''}`}>
          {!inArchive ? (
            <TrashView
              trashedProfiles={trash.trashedProfiles}
              total={trash.pagination.total}
              page={trash.pagination.page}
              pageSize={trash.pagination.pageSize}
              totalPages={trash.pagination.totalPages}
              onPageChange={trash.setPage}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
              onEmptyTrash={handleEmptyTrash}
              onBulkRestore={handleBulkTrash('restore')}
              onBulkDelete={handleBulkTrash('delete')}
              onClose={() => filterState.setView('archive')}
            />
          ) : (
            <>
              <FilterBar
                currentTab={filterState.filters.tab}
                onSelectTab={filterState.selectTab}
                sortBy={filterState.filters.sort}
                onSortChange={filterState.setSort}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                activeTags={filterState.filters.tags}
                tagMode={filterState.filters.tagMode}
                onTagModeChange={filterState.setTagMode}
                onRemoveTag={filterState.removeTag}
                activeCollection={filterState.filters.collection}
                onClearCollection={filterState.clearCollection}
                hasActiveFilters={filterState.hasActiveFilters}
                onClearAll={filterState.clearAll}
                onSaveFilter={handleSaveFilter}
                selectionMode={selection.selectionMode}
                onToggleSelectionMode={toggleSelectionMode}
                resultCount={data.pagination.total}
                platforms={catalog.platforms}
                pageSize={pageSize}
                onPageSizeChange={(next) => { if (PAGE_SIZES.includes(next)) setPageSize(next); }}
              />

              <ProfileCollectionView
                profiles={profiles}
                loading={data.loading}
                viewMode={viewMode}
                pagination={data.pagination}
                onPageChange={handlePageChange}
                onOpen={(profile) => { setSelectedProfileId(profile.id); setIsDetailOpen(true); }}
                onToggleFavorite={handleToggleFavorite}
                onToggleCollection={handleToggleCollection}
                onEdit={openEdit}
                onDelete={setDeleteCandidateId}
                onSelectTag={filterState.addTag}
                onClearFilters={filterState.clearAll}
                onCreate={openCreate}
                selectionMode={selection.selectionMode}
                selectedIds={selection.selected}
                onToggleSelect={selection.toggle}
              />
            </>
          )}
        </main>
      </div>

      {selection.selectionMode && inArchive && (
        <BulkActionBar
          count={selection.selected.size}
          busy={bulkBusy}
          tagOptions={catalog.tagInfos}
          collectionOptions={catalog.collectionInfos}
          onSelectPage={() => selection.addMany(profiles.map((profile) => profile.id))}
          onClear={selection.clear}
          onDone={selection.exit}
          onRun={runBulk}
          onRequestTrash={() => setConfirmBulkTrash(true)}
        />
      )}

      {notice && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-slate-700 bg-[#111827] px-4 py-2 text-xs font-medium text-white shadow-2xl">
          {notice}
        </div>
      )}

      <ProfileDetailPanel
        profile={selectedProfile}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onDeleteProfile={setDeleteCandidateId}
        onEditProfile={openEdit}
      />

      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalProfile}
        initialData={modalInitialData}
        availablePlatforms={catalog.platforms}
        onOpenCreatePlatform={dialogs.openNewPlatform}
        onDuplicateRestored={refreshAfterChange}
      />

      <CatalogDialogs
        dialogs={dialogs}
        onChanged={async () => { await Promise.all([fetchProfiles(true), refreshSidebarData()]); }}
        onPlatformCreated={async (platform) => { catalog.setPlatforms((prev) => [...prev, platform]); await refreshSidebarData(); }}
        onPlatformUpdated={async (updated) => {
          catalog.setPlatforms((prev) => prev.map((platform) => platform.id === updated.id ? { ...platform, ...updated } : platform));
          await Promise.all([fetchProfiles(true), refreshSidebarData()]);
        }}
        onPlatformDeleted={(platform) => { if (filterState.filters.tab === platform.key) filterState.selectTab('all'); }}
        onTagDeleted={filterState.removeTag}
        onCollectionDeleted={(name) => { if (filterState.filters.collection === name) filterState.clearCollection(); }}
        onSavedFilterDeleted={handleDeleteSavedFilter}
      />

      <ConfirmModal
        isOpen={Boolean(deleteCandidateId)}
        title={t('home.moveTrashTitle')}
        message={t('home.moveTrashMessage')}
        confirmLabel={t('profile.moveToTrash')}
        cancelLabel={t('common.cancel')}
        isDangerous
        onConfirm={handleConfirmSoftDelete}
        onCancel={() => setDeleteCandidateId(null)}
      />

      <ConfirmModal
        isOpen={confirmBulkTrash}
        title={t('bulk.trashTitle')}
        message={t('bulk.trashMessage', { count: selection.selected.size })}
        confirmLabel={t('bulk.moveToTrash')}
        cancelLabel={t('common.cancel')}
        isDangerous
        onConfirm={() => { setConfirmBulkTrash(false); void runBulk('trash'); }}
        onCancel={() => setConfirmBulkTrash(false)}
      />
    </div>
  );
}
