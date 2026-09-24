'use client';

import React, { useState, useEffect } from 'react';
import { ActivityLogItem, Profile } from '@/types/profile';
import { 
  X, 
  Heart, 
  CheckCircle2, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Plus, 
  Save, 
  Bookmark, 
  Calendar, 
  Clock, 
  Share2,
  Check,
  Tag,
  FolderHeart,
  ChevronLeft,
  ChevronRight,
  History,
  ChevronDown
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { getTagStyle } from '@/lib/colors';
import { useTranslation } from 'react-i18next';
import { currentLanguage, formatDate as localizeDate, formatDateTime as localizeDateTime } from '@/i18n/format';

interface ProfileDetailPanelProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile: (id: string, patch: Partial<Profile>) => Promise<void>;
  onDeleteProfile: (id: string) => void;
  onEditProfile: (profile: Profile) => void;
}

export function ProfileDetailPanel({
  profile,
  isOpen,
  onClose,
  onUpdateProfile,
  onDeleteProfile,
  onEditProfile,
}: ProfileDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const language = currentLanguage(i18n.language);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [newTagInput, setNewTagInput] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  const [newCollectionInput, setNewCollectionInput] = useState('');
  const [showAddCollection, setShowAddCollection] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  async function loadActivity() {
    if (!profile?.id) return;
    setIsActivityLoading(true);
    try {
      const response = await fetch(`/api/profiles/${profile.id}/activity`);
      const result = await response.json();
      if (result.success) setActivityLogs(result.data);
    } finally {
      setIsActivityLoading(false);
    }
  }

  useEffect(() => {
    if (profile) {
      setNotesText(profile.notes || '');
      setIsEditingNotes(false);
      setShowAddTag(false);
      setShowAddCollection(false);
      setCurrentImageIndex(0);
      setIsActivityOpen(false);
      setActivityLogs([]);
    }
  }, [profile]);

  useEffect(() => {
    if (isActivityOpen) loadActivity();
    // Refresh the open timeline whenever the profile changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActivityOpen, profile?.updatedAt]);

  if (!isOpen || !profile) return null;

  const galleryImages = profile.images?.length
    ? profile.images
    : [{ url: profile.avatarUrl, isCover: true, sortOrder: 0 }];
  const currentImage = galleryImages[currentImageIndex] || galleryImages[0];

  const localizeActivity = (log: ActivityLogItem) => {
    const valueAfterColon = () => log.detail.split(':').slice(1).join(':').trim();
    switch (log.action) {
      case 'CREATED': return t('profile.activityCreated');
      case 'EDITED': return t('profile.activityEdited');
      case 'FAVORITED': return t('profile.activityFavorited');
      case 'UNFAVORITED': return t('profile.activityUnfavorited');
      case 'RESTORED_FROM_TRASH': return t('profile.activityRestored');
      case 'TAG_ADDED': return t('profile.activityTagAdded', { name: valueAfterColon() });
      case 'TAG_REMOVED': return t('profile.activityTagRemoved', { name: valueAfterColon() });
      case 'COLLECTION_ADDED': return t('profile.activityCollectionAdded', { name: valueAfterColon() });
      case 'COLLECTION_REMOVED': return t('profile.activityCollectionRemoved', { name: valueAfterColon() });
      case 'NOTE_UPDATED': {
        const match = log.detail.match(/(?:before|önce):\s*(.*?),\s*(?:after|sonra):\s*(.*)$/i);
        return match
          ? t('profile.activityNoteUpdated', { before: match[1], after: match[2] })
          : log.detail;
      }
      default: return log.detail;
    }
  };

  const isSavedLater = profile.collections.some((c) => c.toLowerCase() === 'sonra bak');

  const handleToggleFavorite = async () => {
    await onUpdateProfile(profile.id, { isFavorite: !profile.isFavorite });
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await onUpdateProfile(profile.id, { notes: notesText.trim() });
    setIsSavingNotes(false);
    setIsEditingNotes(false);
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (!tag) return;
    if (profile.tags.includes(tag)) {
      setNewTagInput('');
      setShowAddTag(false);
      return;
    }
    const updatedTags = [...profile.tags, tag];
    await onUpdateProfile(profile.id, { tags: updatedTags });
    setNewTagInput('');
    setShowAddTag(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = profile.tags.filter((t) => t !== tagToRemove);
    await onUpdateProfile(profile.id, { tags: updatedTags });
  };

  const handleToggleCollection = async (collectionName: string) => {
    const exists = profile.collections.some(
      (c) => c.toLowerCase() === collectionName.toLowerCase()
    );
    let updated: string[];
    if (exists) {
      updated = profile.collections.filter(
        (c) => c.toLowerCase() !== collectionName.toLowerCase()
      );
    } else {
      updated = [...profile.collections, collectionName];
    }
    await onUpdateProfile(profile.id, { collections: updated });
  };

  const handleAddCustomCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const coll = newCollectionInput.trim();
    if (!coll) return;
    if (!profile.collections.includes(coll)) {
      const updated = [...profile.collections, coll];
      await onUpdateProfile(profile.id, { collections: updated });
    }
    setNewCollectionInput('');
    setShowAddCollection(false);
  };

  const handleShare = () => {
    const primaryUrl = profile.platformLinks[0]?.url || profile.profileUrl || window.location.href;
    navigator.clipboard.writeText(primaryUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatDate = (isoString: string) => localizeDate(isoString, language);
  const formatDateTime = (isoString: string) => localizeDateTime(isoString, language);

  // Determine button gradient/color for each platform
  const getButtonColorClass = (pl: any) => {
    const key = pl.platformKey.toLowerCase();
    if (key === 'instagram') return 'from-pink-500 via-rose-500 to-amber-500 text-white shadow-pink-500/20';
    if (key === 'twitter' || key === 'x') return 'from-zinc-800 to-black text-white border border-zinc-700 shadow-zinc-900/40';
    if (key === 'tiktok') return 'from-slate-900 via-zinc-900 to-teal-900 text-cyan-300 border border-teal-500/30';
    if (key === 'youtube') return 'from-red-600 to-red-700 text-white shadow-red-600/20';
    if (key === 'website') return 'from-blue-600 to-indigo-700 text-white shadow-blue-600/20';
    // Custom platform color
    if (pl.platformColor) {
      return `${pl.platformColor} text-white shadow-md`;
    }
    return 'from-purple-600 to-pink-600 text-white';
  };

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        onClick={onClose}
      />

      {/* Main Slide-in Panel */}
      <aside
        className="fixed top-0 right-0 z-50 w-full sm:w-[450px] lg:w-[420px] h-screen bg-[#0a0e17] border-l border-[#1f293d] shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
      >
        {/* Panel Header with close button & quick actions */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition pointer-events-auto shadow-lg"
            title={t('profile.closePanel')}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition shadow-lg"
              title={t('profile.copyLink')}
            >
              {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </button>

            <button
              onClick={() => onEditProfile(profile)}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition shadow-lg"
              title={t('profile.editProfile')}
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Large Hero Image */}
          <div className="relative aspect-[4/4.5] w-full bg-slate-950 overflow-hidden">
            <img
              src={currentImage.url}
              alt={profile.displayName}
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-black/40 opacity-90" />

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentImageIndex((currentImageIndex - 1 + galleryImages.length) % galleryImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 p-2 text-white border border-white/15 hover:bg-black/80"
                  aria-label={t('profile.previousPhoto')}
                ><ChevronLeft className="w-5 h-5" /></button>
                <button
                  type="button"
                  onClick={() => setCurrentImageIndex((currentImageIndex + 1) % galleryImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 p-2 text-white border border-white/15 hover:bg-black/80"
                  aria-label={t('profile.nextPhoto')}
                ><ChevronRight className="w-5 h-5" /></button>
                <div className="absolute bottom-16 inset-x-4 z-10 flex gap-2 overflow-x-auto justify-center pb-1">
                  {galleryImages.map((image, index) => (
                    <button
                      key={image.id || `${image.url}-${index}`}
                      type="button"
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 ${index === currentImageIndex ? 'border-pink-500' : 'border-white/30 opacity-75 hover:opacity-100'}`}
                    >
                      <img src={image.url} alt={`${profile.displayName} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Platform pills on bottom left of image */}
            <div className="absolute bottom-4 left-5 flex items-center gap-1.5 flex-wrap max-w-[70%]">
              {profile.platformLinks.map((pl, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-black/60 text-white border border-white/15 shadow-md"
                >
                  <PlatformIcon platform={pl.platformKey} iconName={pl.platformIcon} size={13} />
                  <span>{pl.platformName}</span>
                </div>
              ))}
            </div>

            {/* Favorite button bottom right of image */}
            <button
              onClick={handleToggleFavorite}
              className="absolute bottom-4 right-5 p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:scale-110 active:scale-95 transition shadow-xl"
              title={profile.isFavorite ? t('profile.removeFavorite') : t('profile.addFavorite')}
            >
              <Heart
                className={`w-5 h-5 ${
                  profile.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'
                }`}
              />
            </button>
          </div>

          {/* Details Body */}
          <div className="p-6 space-y-6">
            {/* Title & Names */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {profile.displayName}
                </h2>
                {profile.isVerified && (
                  <CheckCircle2 className="w-5 h-5 text-sky-400 fill-sky-400/20 shrink-0" />
                )}
              </div>
              <p className="text-sm font-semibold text-pink-400 mt-0.5">
                @{profile.username}
              </p>
            </div>

            {/* Bio / Quote */}
            {profile.bio && (
              <div className="p-4 rounded-2xl bg-[#111827] border border-[#1f293d] relative">
                <span className="text-3xl text-pink-500/30 font-serif absolute -top-1 left-2 pointer-events-none">
                  “
                </span>
                <p className="text-sm text-slate-300 italic pl-3 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Dynamic Platform Link Buttons (Requirement 3: Bug Fix & Multi-Platform) */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('profile.links')} ({profile.platformLinks.length})
              </label>

              {profile.platformLinks.length > 0 ? (
                profile.platformLinks.map((pl, idx) => {
                  const colorClass = getButtonColorClass(pl);
                  const btnText = `${pl.platformName}${pl.label?.trim() ? ` (${pl.label})` : ''} ${t('common.open')}`;
                  return (
                    <a
                      key={idx}
                      href={pl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full flex items-center justify-between py-3 px-4 rounded-xl font-semibold text-sm shadow-lg hover:opacity-95 active:scale-[0.99] transition bg-gradient-to-r ${colorClass}`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <PlatformIcon platform={pl.platformKey} iconName={pl.platformIcon} size={18} />
                        <span className="truncate">{btnText}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 opacity-75 shrink-0" />
                    </a>
                  );
                })
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500 text-center">
                  {t('profile.noLinks')}
                </div>
              )}
            </div>

            {/* Tags Section */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-pink-400" />
                  <span>{t('profile.tags')}</span>
                </div>
                <button
                  onClick={() => setShowAddTag(!showAddTag)}
                  className="text-xs text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('profile.addTag')}</span>
                </button>
              </div>

              {showAddTag && (
                <form onSubmit={handleAddTag} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder={t('profile.newTagPlaceholder')}
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-[#111827] border border-[#1f293d] text-white focus:outline-none focus:border-pink-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-pink-500 text-white text-xs font-semibold hover:bg-pink-600 transition"
                  >
                    {t('common.add')}
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-1.5">
                {profile.tags.map((tag) => {
                  const style = getTagStyle(tag);
                  return (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${style.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:opacity-75 p-0.5 rounded transition"
                        title={t('profile.removeTag')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Notes Section (Editable) */}
            <div className="p-4 rounded-2xl bg-[#111827] border border-[#1f293d] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('profile.notes')}</span>
                </div>
                {!isEditingNotes && (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t('common.edit')}</span>
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder={t('profile.notesPlaceholder')}
                    className="w-full text-xs p-3 rounded-xl bg-[#0a0e17] border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setNotesText(profile.notes || '');
                        setIsEditingNotes(false);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingNotes ? t('common.saving') : t('common.save')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {profile.notes || (
                    <span className="text-slate-500 italic">
                      {t('profile.noNotes')}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Activity timeline */}
            <div className="rounded-2xl bg-[#111827] border border-[#1f293d] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsActivityOpen((open) => !open)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <History className="w-4 h-4 text-sky-400" /> {t('profile.activity')}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isActivityOpen ? 'rotate-180' : ''}`} />
              </button>
              {isActivityOpen && (
                <div className="border-t border-[#1f293d] px-4 py-3">
                  {isActivityLoading ? (
                    <p className="text-xs text-slate-500">{t('profile.activityLoading')}</p>
                  ) : activityLogs.length ? (
                    <ol className="relative ml-2 border-l border-slate-700 space-y-4 py-1">
                      {activityLogs.map((log) => (
                        <li key={log.id} className="relative pl-5">
                          <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-sky-400 ring-4 ring-[#111827]" />
                          <p className="text-xs text-slate-200 leading-relaxed">{localizeActivity(log)}</p>
                          <time className="text-[10px] text-slate-500">{formatDateTime(log.createdAt)}</time>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-slate-500">{t('profile.noActivity')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Collections Section */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <FolderHeart className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('profile.collections')}</span>
                </div>
                <button
                  onClick={() => setShowAddCollection(!showAddCollection)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('profile.addCollection')}</span>
                </button>
              </div>

              {showAddCollection && (
                <form onSubmit={handleAddCustomCollection} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder={t('profile.collectionPlaceholder')}
                    value={newCollectionInput}
                    onChange={(e) => setNewCollectionInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-[#111827] border border-[#1f293d] text-white focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 transition"
                  >
                    {t('common.add')}
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleToggleCollection('Sonra Bak')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    isSavedLater
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#111827] text-slate-400 border-[#1f293d] hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSavedLater ? 'fill-amber-400' : ''}`} />
                  <span>{t('sidebar.watchLater')}</span>
                </button>

                {profile.collections
                  .filter((c) => c.toLowerCase() !== 'sonra bak')
                  .map((col) => (
                    <button
                      key={col}
                      onClick={() => handleToggleCollection(col)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition"
                      title={t('profile.removeCollection')}
                    >
                      <span>📁 {['favoriler', 'favorites'].includes(col.toLowerCase()) ? t('sidebar.favorites') : col}</span>
                      <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                    </button>
                  ))}
              </div>
            </div>

            {/* Timestamps & Meta */}
            <div className="pt-2 border-t border-[#1f293d] text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('profile.added', { date: formatDate(profile.createdAt) })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{t('profile.lastUpdated', { date: formatDate(profile.updatedAt) })}</span>
              </div>
            </div>

            {/* Delete Profile (Soft Delete to Trash) */}
            <div className="pt-4 border-t border-rose-500/20">
              <button
                onClick={() => onDeleteProfile(profile.id)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 font-semibold text-xs transition duration-150"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('profile.moveToTrash')}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
