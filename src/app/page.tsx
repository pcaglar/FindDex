'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Profile, PlatformItem, SortOption } from '@/types/profile';
import { applyThemePreference, watchTheme } from '@/lib/theme';
import { PREFERENCE_CHANGE_EVENT, readHomeDefaults, readPreference, SIDEBAR_COLLAPSED_KEY, SIDEBAR_WIDTH_KEY } from '@/lib/preferences';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { FilterBar } from '@/components/FilterBar';
import { ProfileCard } from '@/components/ProfileCard';
import { ProfileListItem } from '@/components/ProfileListItem';
import { ProfileDetailPanel } from '@/components/ProfileDetailPanel';
import { ProfileModal } from '@/components/ProfileModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CustomPlatformModal } from '@/components/CustomPlatformModal';
import { TrashView } from '@/components/TrashView';
import { TagEditModal } from '@/components/TagEditModal';
import { CollectionEditModal } from '@/components/CollectionEditModal';
import { PaginationControls } from '@/components/PaginationControls';
import { Plus, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarStatsData {
  total: number;
  favorites: number;
  later: number;
  trashCount: number;
  withWebsite: number;
  platforms: Record<string, number>;
  tags: Record<string, number>;
  collections: Record<string, number>;
}

export default function HomePage() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [trashedProfiles, setTrashedProfiles] = useState<Profile[]>([]);
  const [platforms, setPlatforms] = useState<PlatformItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SidebarStatsData | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 16, total: 0, totalPages: 1 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const contentTopRef = useRef<HTMLElement>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState('all'); // 'all' | 'favorites' | 'later' | 'trash' | 'collection:*' | 'tag:*' | 'platform:*'
  const [currentTab, setCurrentTab] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Active Tag & Collection drill-downs
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  // Selected Profile for Slide-in Detail Panel
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Add / Edit Profile Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Profile | null>(null);

  // Custom Platform Modal
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [editPlatformData, setEditPlatformData] = useState<PlatformItem | null>(null);

  // Tag infos (id + name) fetched from API for edit/delete
  const [tagInfos, setTagInfos] = useState<{ id: string; name: string; color?: string; count?: number }[]>([]);
  // Tag edit modal
  const [editTagData, setEditTagData] = useState<{ id: string; name: string; color?: string; count?: number } | null>(null);
  // Tag delete confirm
  const [deleteTagCandidate, setDeleteTagCandidate] = useState<{ id: string; name: string; count?: number } | null>(null);

  // Collection infos (id + name) fetched from API for edit/delete
  const [collectionInfos, setCollectionInfos] = useState<{ id: string; name: string; count?: number }[]>([]);
  // Collection edit modal
  const [editCollectionData, setEditCollectionData] = useState<{ id: string; name: string } | null>(null);
  // Collection delete confirm
  const [deleteCollectionCandidate, setDeleteCollectionCandidate] = useState<{ id: string; name: string; count?: number } | null>(null);

  // Platform delete confirm
  const [deletePlatformCandidate, setDeletePlatformCandidate] = useState<PlatformItem | null>(null);

  // Delete to trash confirmation
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(260);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedWidth = Number(readPreference(SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(savedWidth) && savedWidth >= 220 && savedWidth <= 400) {
      setDesktopSidebarWidth(savedWidth);
    }
    setIsDesktopSidebarCollapsed(readPreference(SIDEBAR_COLLAPSED_KEY) === 'true');
    const syncReset = (event: Event) => {
      if ((event as CustomEvent).detail?.sidebarReset) {
        setDesktopSidebarWidth(260);
        setIsDesktopSidebarCollapsed(false);
      }
    };
    window.addEventListener(PREFERENCE_CHANGE_EVENT, syncReset);
    return () => window.removeEventListener(PREFERENCE_CHANGE_EVENT, syncReset);
  }, []);

  const handleDesktopSidebarWidthChange = useCallback((width: number) => {
    const safeWidth = Math.round(Math.min(400, Math.max(220, width)));
    setDesktopSidebarWidth(safeWidth);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(safeWidth));
  }, []);

  const handleToggleDesktopSidebar = useCallback(() => {
    setIsDesktopSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);


  // Theme state - initialize from localStorage
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const defaults = readHomeDefaults();
    setPageSize(defaults.pageSize);
    setViewMode(defaults.viewMode);
    setSortBy(defaults.sortBy);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, currentTab, activeTag, activeCollection, sortBy, pageSize]);

  // Sync theme on mount
  useEffect(() => {
    return watchTheme((theme) => setIsDark(theme === 'dark'));
  }, []);

  // Theme toggle
  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyThemePreference(next ? 'dark' : 'light');
      return next;
    });
  };

  // Fetch active profiles
  const fetchProfiles = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort: sortBy,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (activeTag) params.set('tag', activeTag);
      if (activeCollection) params.set('collection', activeCollection);
      if (currentTab === 'favorites' || currentTab === 'hasWebsite') {
        params.set('filter', currentTab);
      } else if (currentTab !== 'all') {
        params.set('platform', currentTab);
      }
      const res = await fetch(`/api/profiles?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        if (page > data.pagination.totalPages) {
          setPage(data.pagination.totalPages);
          return;
        }
        setProfiles(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeCollection, activeTag, currentTab, debouncedSearch, page, pageSize, sortBy]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Fetch platforms
  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await fetch('/api/platforms');
      const data = await res.json();
      if (data.success) {
        setPlatforms(data.data);
      }
    } catch (err) {
      console.error('Failed to load platforms:', err);
    }
  }, []);

  // Fetch trashed profiles
  const fetchTrash = useCallback(async () => {
    try {
      const res = await fetch('/api/trash');
      const data = await res.json();
      if (data.success) {
        setTrashedProfiles(data.data);
      }
    } catch (err) {
      console.error('Failed to load trash:', err);
    }
  }, []);

  // Fetch tags with IDs
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.success) {
        setTagInfos(data.data); // [{id, name, count}]
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, []);

  // Fetch collections with IDs
  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      if (data.success) {
        setCollectionInfos(data.data); // [{id, name, count}]
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  }, []);

  const refreshSidebarData = useCallback(async () => {
    await Promise.all([fetchStats(), fetchPlatforms(), fetchTags(), fetchCollections()]);
  }, [fetchCollections, fetchPlatforms, fetchStats, fetchTags]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    fetchTrash();
    refreshSidebarData();
  }, [fetchTrash, refreshSidebarData]);


  // Sync selectedProfile
  const selectedProfile = useMemo(() => {
    return profiles.find((p) => p.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId]);

  // Nav item click handler
  const handleSelectNav = (navKey: string) => {
    setActiveNav(navKey);
    if (navKey === 'all') {
      setCurrentTab('all');
      setActiveTag(null);
      setActiveCollection(null);
    } else if (navKey === 'favorites') {
      setCurrentTab('favorites');
      setActiveTag(null);
      setActiveCollection(null);
    } else if (navKey === 'later') {
      setCurrentTab('all');
      setActiveCollection('Sonra Bak');
      setActiveTag(null);
    } else if (navKey === 'trash') {
      fetchTrash();
    } else if (navKey.startsWith('collection:')) {
      const collName = navKey.replace('collection:', '');
      setActiveCollection(collName);
      setCurrentTab('all');
    } else if (navKey.startsWith('tag:')) {
      const tagName = navKey.replace('tag:', '');
      setActiveTag(tagName);
      setCurrentTab('all');
    } else if (navKey.startsWith('platform:')) {
      const platKey = navKey.replace('platform:', '');
      setCurrentTab(platKey);
      setActiveTag(null);
      setActiveCollection(null);
    }
  };

  // Filter Bar Tab Selection
  const handleSelectTab = (tabKey: string) => {
    setCurrentTab(tabKey);
    if (activeNav === 'trash') {
      setActiveNav('all');
    }
    if (tabKey === 'all') {
      setActiveNav('all');
    } else if (tabKey === 'favorites') {
      setActiveNav('favorites');
    } else {
      setActiveNav(`platform:${tabKey}`);
    }
  };

  // Toggle favorite on profile
  const handleToggleFavorite = async (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const newFav = !profile.isFavorite;

    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, isFavorite: newFav } : p))
    );

    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newFav }),
      });
      if (!response.ok) throw new Error(t('errors.favoriteUpdate'));
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
    } catch (err) {
      console.error('Failed to update favorite status', err);
      fetchProfiles(true);
    }
  };

  // Toggle collection on profile
  const handleToggleCollection = async (profileId: string, collName: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    const exists = profile.collections.some(
      (c) => c.toLowerCase() === collName.toLowerCase()
    );
    const newCollections = exists
      ? profile.collections.filter((c) => c.toLowerCase() !== collName.toLowerCase())
      : [...profile.collections, collName];

    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, collections: newCollections } : p))
    );

    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: newCollections }),
      });
      if (!response.ok) throw new Error(t('errors.collectionUpdate'));
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
    } catch (err) {
      console.error('Failed to update collection', err);
      fetchProfiles(true);
    }
  };

  // Update profile from detail panel
  const handleUpdateProfile = async (id: string, patch: Partial<Profile>) => {
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success) {
        setProfiles((prev) => prev.map((p) => (p.id === id ? data.data : p)));
        await Promise.all([fetchProfiles(true), refreshSidebarData()]);
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      fetchProfiles(true);
    }
  };

  // Save profile from Add / Edit modal
  const handleSaveModalProfile = async (data: any) => {
    const endpoint = modalInitialData ? `/api/profiles/${modalInitialData.id}` : '/api/profiles';
    const res = await fetch(endpoint, {
      method: modalInitialData ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      const error = new Error(result.error || t('profile.saveFailed')) as Error & { code?: string };
      error.code = result.code;
      throw error;
    }

    if (modalInitialData) {
      setProfiles((prev) => prev.map((profile) => profile.id === modalInitialData.id ? result.data : profile));
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
    } else {
      setPage(1);
      setProfiles((current) => [result.data, ...current.filter((profile) => profile.id !== result.data.id)].slice(0, pageSize));
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
      setSelectedProfileId(result.data.id);
      setIsDetailOpen(true);
    }
  };

  // Soft Delete confirmation -> moves to trash
  const handleConfirmSoftDelete = async () => {
    if (!deleteCandidateId) return;
    const id = deleteCandidateId;
    setDeleteCandidateId(null);

    if (selectedProfileId === id) {
      setIsDetailOpen(false);
      setSelectedProfileId(null);
    }

    const removed = profiles.find((p) => p.id === id);
    if (removed) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      setTrashedProfiles((prev) => [{ ...removed, deletedAt: new Date().toISOString() }, ...prev]);
    }

    try {
      await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      await Promise.all([fetchProfiles(true), fetchTrash(), refreshSidebarData()]);
    } catch (err) {
      console.error('Failed to soft delete profile', err);
      fetchProfiles(true);
      fetchTrash();
    }
  };

  // Restore from trash
  const handleRestoreFromTrash = async (id: string) => {
    try {
      const res = await fetch(`/api/trash/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchProfiles(true), fetchTrash(), refreshSidebarData()]);
      }
    } catch (err) {
      console.error('Failed to restore profile', err);
    }
  };

  // Permanent delete from trash
  const handlePermanentDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/trash/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTrashedProfiles((prev) => prev.filter((p) => p.id !== id));
        await refreshSidebarData();
      }
    } catch (err) {
      console.error('Failed to permanently delete', err);
    }
  };

  // Empty trash
  const handleEmptyTrash = async () => {
    try {
      const res = await fetch('/api/trash', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTrashedProfiles([]);
        await refreshSidebarData();
      }
    } catch (err) {
      console.error('Failed to empty trash', err);
    }
  };

  const handleCreateTag = async (name: string) => {
    const response = await fetch('/api/tags', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
    const result = await response.json();
    if (result.success) {
      await Promise.all([fetchTags(), fetchStats(), fetchProfiles(true)]);
      setActiveTag(name);
      setActiveNav(`tag:${name}`);
    }
  };

  const handleDeletePlatform = async () => {
    if (!deletePlatformCandidate) return;
    const candidate = deletePlatformCandidate;
    setDeletePlatformCandidate(null);
    const response = await fetch(`/api/platforms/${candidate.id}`, { method: 'DELETE' });
    if (response.ok) {
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
      if (activeNav === `platform:${candidate.key}`) handleSelectNav('all');
    }
  };

  const handleDeleteTag = async () => {
    if (!deleteTagCandidate) return;
    const candidate = deleteTagCandidate;
    setDeleteTagCandidate(null);
    const response = await fetch(`/api/tags/${candidate.id}`, { method: 'DELETE' });
    if (response.ok) {
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
      if (activeTag === candidate.name) handleSelectNav('all');
    }
  };

  const handleDeleteCollection = async () => {
    if (!deleteCollectionCandidate) return;
    const candidate = deleteCollectionCandidate;
    setDeleteCollectionCandidate(null);
    const response = await fetch(`/api/collections/${candidate.id}`, { method: 'DELETE' });
    if (response.ok) {
      await Promise.all([fetchProfiles(true), refreshSidebarData()]);
      if (activeCollection === candidate.name) handleSelectNav('all');
    }
  };

  const refreshAllData = async () => {
    await Promise.all([fetchProfiles(true), fetchTrash(), refreshSidebarData()]);
    setSelectedProfileId(null);
    setIsDetailOpen(false);
    handleSelectNav('all');
  };

  // Open Edit modal
  const handleOpenEdit = (profile: Profile) => {
    setModalInitialData(profile);
    setIsModalOpen(true);
  };

  // Open Create modal
  const handleOpenCreate = () => {
    setModalInitialData(null);
    setIsModalOpen(true);
  };

  // Open Detail Panel
  const handleOpenDetail = (profile: Profile) => {
    setSelectedProfileId(profile.id);
    setIsDetailOpen(true);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    if (![8, 12, 16, 24, 48].includes(nextPageSize)) return;
    setPageSize(nextPageSize);
  };

  const handlePageChange = (nextPage: number) => {
    const safePage = Math.min(Math.max(1, nextPage), pagination.totalPages);
    if (safePage === page) return;
    setPage(safePage);
    requestAnimationFrame(() => contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] flex text-slate-900 dark:text-slate-100">
      {/* Left Sidebar */}
      <Sidebar
        stats={stats}
        platforms={platforms}
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenNewProfile={handleOpenCreate}
        onOpenNewPlatform={() => { setEditPlatformData(null); setIsPlatformModalOpen(true); }}
        onAddCustomTag={handleCreateTag}
        tagInfos={tagInfos}
        collectionInfos={collectionInfos}
        onEditPlatform={(platform) => { setEditPlatformData(platform); setIsPlatformModalOpen(true); }}
        onDeletePlatform={setDeletePlatformCandidate}
        onEditTag={setEditTagData}
        onDeleteTag={setDeleteTagCandidate}
        onEditCollection={setEditCollectionData}
        onDeleteCollection={setDeleteCollectionCandidate}
        desktopWidth={desktopSidebarWidth}
        onDesktopWidthChange={handleDesktopSidebarWidthChange}
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onToggleDesktopCollapsed={handleToggleDesktopSidebar}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isDetailOpen ? 'lg:mr-[420px]' : ''}`}>
        {/* Top Bar */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNewProfile={handleOpenCreate}
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(true)}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
        />

        {/* Main Body */}
        <main ref={contentTopRef} className="flex-1 scroll-mt-20 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeNav === 'trash' ? (
            /* Trash Can View */
            <TrashView
              trashedProfiles={trashedProfiles}
              onRestore={handleRestoreFromTrash}
              onPermanentDelete={handlePermanentDelete}
              onEmptyTrash={handleEmptyTrash}
              onClose={() => setActiveNav('all')}
            />
          ) : (
            /* Regular Dashboard View */
            <>
              {/* Filter Bar */}
              <FilterBar
                currentTab={currentTab}
                onSelectTab={handleSelectTab}
                sortBy={sortBy}
                onSortChange={setSortBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                activeTag={activeTag}
                onClearTag={() => setActiveTag(null)}
                activeCollection={activeCollection}
                onClearCollection={() => setActiveCollection(null)}
                resultCount={pagination.total}
                platforms={platforms}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />

              {/* Profiles Grid / List */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-3" />
                  <p className="text-xs">{t('home.loadingProfiles')}</p>
                </div>
              ) : profiles.length === 0 ? (
                /* Empty State */
                <div className="py-16 px-4 rounded-3xl bg-[#111827]/50 border border-[#1f293d] flex flex-col items-center justify-center text-center max-w-md mx-auto my-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-pink-400 mb-4 shadow-lg">
                    <SearchX className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{t('home.noMatch')}</h3>
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                    {t('home.noMatchDescription')}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveNav('all');
                        setCurrentTab('all');
                        setActiveTag(null);
                        setActiveCollection(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
                    >
                      {t('home.clearFilters')}
                    </button>
                    <button
                      onClick={handleOpenCreate}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600 shadow-md shadow-pink-500/25 hover:from-pink-600 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('topbar.newProfile')}</span>
                    </button>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                /* Responsive Grid: 4 columns on desktop (>=1024px / lg), 2-3 on tablet, 1 on mobile */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {profiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      onClick={() => handleOpenDetail(profile)}
                      onToggleFavorite={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(profile.id);
                      }}
                      onToggleCollection={(e, coll) => {
                        e.stopPropagation();
                        handleToggleCollection(profile.id, coll);
                      }}
                      onEdit={() => handleOpenEdit(profile)}
                      onDelete={() => setDeleteCandidateId(profile.id)}
                      onSelectTag={(tag) => setActiveTag(tag)}
                    />
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-2.5">
                  {profiles.map((profile) => (
                    <ProfileListItem
                      key={profile.id}
                      profile={profile}
                      onClick={() => handleOpenDetail(profile)}
                      onToggleFavorite={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(profile.id);
                      }}
                      onToggleCollection={(e, coll) => {
                        e.stopPropagation();
                        handleToggleCollection(profile.id, coll);
                      }}
                      onEdit={() => handleOpenEdit(profile)}
                      onDelete={() => setDeleteCandidateId(profile.id)}
                      onSelectTag={(tag) => setActiveTag(tag)}
                    />
                  ))}
                </div>
              )}

              {!loading && profiles.length > 0 && (
                <PaginationControls
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Right Slide-in Detail Panel */}
      <ProfileDetailPanel
        profile={selectedProfile}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onDeleteProfile={(id) => {
          setDeleteCandidateId(id);
        }}
        onEditProfile={(prof) => {
          handleOpenEdit(prof);
        }}
      />

      {/* Add / Edit Profile Modal */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalProfile}
        initialData={modalInitialData}
        availablePlatforms={platforms}
        onOpenCreatePlatform={() => { setEditPlatformData(null); setIsPlatformModalOpen(true); }}
        onDuplicateRestored={async () => { await Promise.all([fetchProfiles(true), fetchTrash(), refreshSidebarData()]); }}
      />

      {/* Custom Platform Modal */}
      <CustomPlatformModal
        isOpen={isPlatformModalOpen}
        onClose={() => { setIsPlatformModalOpen(false); setEditPlatformData(null); }}
        editData={editPlatformData}
        onCreated={async (newPlat) => {
          setPlatforms((prev) => [...prev, newPlat]);
          await refreshSidebarData();
        }}
        onUpdated={async (updated) => {
          setPlatforms((prev) => prev.map((platform) => platform.id === updated.id ? { ...platform, ...updated } : platform));
          await Promise.all([fetchProfiles(true), refreshSidebarData()]);
        }}
      />

      {editTagData && (
        <TagEditModal
          isOpen
          tagId={editTagData.id}
          tagName={editTagData.name}
          tagColor={editTagData.color}
          onClose={() => setEditTagData(null)}
          onUpdated={async () => { setEditTagData(null); await Promise.all([fetchProfiles(true), refreshSidebarData()]); }}
        />
      )}

      {editCollectionData && (
        <CollectionEditModal
          isOpen
          collectionId={editCollectionData.id}
          collectionName={editCollectionData.name}
          onClose={() => setEditCollectionData(null)}
          onRenamed={async () => { setEditCollectionData(null); await Promise.all([fetchProfiles(true), refreshSidebarData()]); }}
        />
      )}


      <ConfirmModal
        isOpen={Boolean(deletePlatformCandidate)}
        title={t('sidebar.deletePlatform')}
        message={t('home.deletePlatformMessage', { name: `“${deletePlatformCandidate?.name || ''}”`, count: deletePlatformCandidate?.count || 0 })}
        confirmLabel={t('sidebar.deletePlatform')}
        isDangerous
        onConfirm={handleDeletePlatform}
        onCancel={() => setDeletePlatformCandidate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTagCandidate)}
        title={t('sidebar.deleteTag')}
        message={t('home.deleteTagMessage', { name: `“${deleteTagCandidate?.name || ''}”`, count: deleteTagCandidate?.count || 0 })}
        confirmLabel={t('sidebar.deleteTag')}
        isDangerous
        onConfirm={handleDeleteTag}
        onCancel={() => setDeleteTagCandidate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteCollectionCandidate)}
        title={t('sidebar.deleteCollection')}
        message={t('home.deleteCollectionMessage', { name: `“${deleteCollectionCandidate?.name || ''}”`, count: deleteCollectionCandidate?.count || 0 })}
        confirmLabel={t('sidebar.deleteCollection')}
        isDangerous
        onConfirm={handleDeleteCollection}
        onCancel={() => setDeleteCollectionCandidate(null)}
      />

      {/* Soft Delete to Trash Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteCandidateId)}
        title={t('home.moveTrashTitle')}
        message={t('home.moveTrashMessage')}
        confirmLabel={t('profile.moveToTrash')}
        cancelLabel={t('common.cancel')}
        isDangerous={true}
        onConfirm={handleConfirmSoftDelete}
        onCancel={() => setDeleteCandidateId(null)}
      />
    </div>
  );
}
