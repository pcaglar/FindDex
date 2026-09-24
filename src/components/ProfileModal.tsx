'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Profile, PlatformItem } from '@/types/profile';
import { 
  X, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Heart, 
  Trash2, 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Check,
  AlertCircle
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { useTranslation } from 'react-i18next';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: Profile | null;
  availablePlatforms: PlatformItem[];
  onOpenCreatePlatform?: () => void;
  onDuplicateRestored?: () => Promise<void> | void;
}

interface DuplicateCandidate {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  deletedAt: string | null;
  reasons: string[];
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80',
];

const SUGGESTED_TAGS = [
  'Fashion', 'Fitness', 'Cosplay', 'Tattoo', 'Travel', 
  'Blonde', 'Brunette', 'Turkey', 'Europe', 'Photography', 'Gaming'
];

interface FormLink {
  platformKey: string;
  url: string;
  label?: string;
}

interface FormImage {
  id?: string;
  url: string;
  isCover: boolean;
  sortOrder: number;
}

export function ProfileModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  availablePlatforms,
  onOpenCreatePlatform,
  onDuplicateRestored,
}: ProfileModalProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [links, setLinks] = useState<FormLink[]>([]);
  
  // Image handling: 'url' vs 'upload'
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [images, setImages] = useState<FormImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggedImageIndex = useRef<number | null>(null);

  const [bio, setBio] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [restoringDuplicateId, setRestoringDuplicateId] = useState<string | null>(null);

  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setUsername(initialData.username || '');
      setDisplayName(initialData.displayName || '');
      const initialImages = initialData.images?.length
        ? initialData.images.map((image, index) => ({ ...image, sortOrder: index }))
        : initialData.avatarUrl ? [{ url: initialData.avatarUrl, isCover: true, sortOrder: 0 }] : [];
      setImages(initialImages);
      setAvatarUrl(initialImages.find((image) => image.isCover)?.url || initialImages[0]?.url || '');
      setImageMode(initialData.avatarUrl?.startsWith('/uploads/') ? 'upload' : 'url');
      setBio(initialData.bio || '');
      setNotes(initialData.notes || '');
      setTags(initialData.tags || []);
      setIsFavorite(initialData.isFavorite || false);
      setIsVerified(initialData.isVerified || false);
      setCollections(initialData.collections || []);

      if (initialData.platformLinks && initialData.platformLinks.length > 0) {
        setLinks(
          initialData.platformLinks.map((l) => ({
            platformKey: l.platformKey,
            url: l.url,
            label: l.label || undefined,
          }))
        );
      } else {
        // Fallback
        const defaultLinks: FormLink[] = [];
        if (initialData.profileUrl) {
          defaultLinks.push({
            platformKey: initialData.platform || 'instagram',
            url: initialData.profileUrl,
          });
        }
        if (initialData.websiteUrl) {
          defaultLinks.push({
            platformKey: 'website',
            url: initialData.websiteUrl,
            label: 'Website',
          });
        }
        setLinks(defaultLinks.length ? defaultLinks : [{ platformKey: 'instagram', url: '' }]);
      }
    } else {
      setUsername('');
      setDisplayName('');
      setAvatarUrl(PRESET_AVATARS[0]);
      setImages([{ url: PRESET_AVATARS[0], isCover: true, sortOrder: 0 }]);
      setImageMode('url');
      setBio('');
      setNotes('');
      setTags(['Fashion']);
      setIsFavorite(false);
      setIsVerified(false);
      setCollections([]);
      setLinks([
        { platformKey: 'instagram', url: '' },
      ]);
    }
    setErrorMessage('');
    setDuplicateCandidates([]);
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const meaningfulInput = username.trim() || displayName.trim() || links.some((link) => link.url.trim());
    if (!meaningfulInput) {
      setDuplicateCandidates([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (username.trim()) params.set('username', username);
      if (displayName.trim()) params.set('name', displayName);
      links.forEach((link) => link.url.trim() && params.append('url', link.url.trim()));
      if (initialData?.id) params.set('excludeId', initialData.id);
      setIsCheckingDuplicates(true);
      try {
        const response = await fetch(`/api/profiles/duplicates?${params.toString()}`, { signal: controller.signal });
        const result = await response.json();
        if (result.success) setDuplicateCandidates(result.data);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.error('Duplicate check failed', error);
      } finally {
        if (!controller.signal.aborted) setIsCheckingDuplicates(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [username, displayName, links, initialData?.id, isOpen]);

  const handleRestoreDuplicate = async (id: string) => {
    setRestoringDuplicateId(id);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/trash/${id}`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || t('errors.generic'));
      setDuplicateCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, deletedAt: null } : candidate));
      await onDuplicateRestored?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('errors.generic'));
    } finally {
      setRestoringDuplicateId(null);
    }
  };

  if (!isOpen) return null;

  // Auto-generate primary platform link when username changes
  const handleUsernameChange = (val: string) => {
    setUsername(val);
    const clean = val.replace(/^@/, '').trim();
    if (!isEditing && clean && links.length === 1 && !links[0].url) {
      const pKey = links[0].platformKey;
      let generatedUrl = '';
      if (pKey === 'instagram') generatedUrl = `https://instagram.com/${clean}`;
      else if (pKey === 'twitter') generatedUrl = `https://x.com/${clean}`;
      else if (pKey === 'tiktok') generatedUrl = `https://tiktok.com/@${clean}`;
      else if (pKey === 'youtube') generatedUrl = `https://youtube.com/@${clean}`;
      else if (pKey === 'website') generatedUrl = `https://${clean}.com`;
      if (generatedUrl) {
        setLinks([{ ...links[0], url: generatedUrl }]);
      }
    }
  };

  // Add a new link row
  const handleAddLinkRow = (defaultKey?: string) => {
    const key = defaultKey || (availablePlatforms[0]?.key || 'instagram');
    setLinks([...links, { platformKey: key, url: '' }]);
  };

  // Update a link row
  const handleUpdateLink = (index: number, patch: Partial<FormLink>) => {
    setLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l))
    );
  };

  // Remove a link row
  const handleRemoveLinkRow = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // File Upload Handling
  const addOrReplaceCoverUrl = (url: string) => {
    setAvatarUrl(url);
    if (!url.trim()) return;
    setImages((current) => {
      if (!current.length) return [{ url, isCover: true, sortOrder: 0 }];
      return current.map((image) => image.isCover ? { ...image, url } : image);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage(t('profile.unsupportedImage'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(t('profile.imageTooLarge'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(30);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(70);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadProgress(100);
        setImages((current) => {
          if (current.some((image) => image.url === data.url)) return current;
          const onlyDefaultPreset = current.length === 1 && PRESET_AVATARS.includes(current[0].url);
          const base = onlyDefaultPreset ? [] : current;
          const next = [...base, { url: data.url, isCover: base.length === 0, sortOrder: base.length }];
          const cover = next.find((image) => image.isCover) || next[0];
          setAvatarUrl(cover.url);
          return next;
        });
      } else {
        setErrorMessage(data.error || t('profile.uploadFailed'));
      }
    } catch (err) {
      setErrorMessage(t('profile.uploadServerError'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) Array.from(e.dataTransfer.files).forEach(handleFileUpload);
  };

  const setCoverImage = (index: number) => {
    setImages((current) => current.map((image, imageIndex) => ({ ...image, isCover: imageIndex === index })));
    setAvatarUrl(images[index]?.url || avatarUrl);
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      const removedWasCover = current[index]?.isCover;
      const next = current.filter((_, imageIndex) => imageIndex !== index)
        .map((image, imageIndex) => ({ ...image, sortOrder: imageIndex }));
      if (removedWasCover && next.length) next[0] = { ...next[0], isCover: true };
      setAvatarUrl(next.find((image) => image.isCover)?.url || next[0]?.url || '');
      return next;
    });
  };

  const moveImage = (toIndex: number) => {
    const fromIndex = draggedImageIndex.current;
    if (fromIndex === null || fromIndex === toIndex) return;
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((image, index) => ({ ...image, sortOrder: index }));
    });
    draggedImageIndex.current = null;
  };

  // Tag helpers
  const handleAddTag = (tagToAdd: string) => {
    const t = tagToAdd.trim();
    if (!t) return;
    if (!tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) {
      setErrorMessage(t('profile.validationRequired'));
      return;
    }

    // Filter valid links
    const validLinks = links.filter((l) => l.url.trim().length > 0);
    if (validLinks.length === 0) {
      // Create fallback link if empty
      const clean = username.replace(/^@/, '').trim();
      validLinks.push({
        platformKey: 'instagram',
        url: `https://instagram.com/${clean}`,
      });
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSave({
        username: username.replace(/^@/, '').trim(),
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || PRESET_AVATARS[0],
        images: images.map((image, index) => ({ ...image, sortOrder: index })),
        bio: bio.trim() || undefined,
        notes: notes.trim() || undefined,
        tags,
        collections,
        isFavorite,
        isVerified,
        platformLinks: validLinks,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(t('profile.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0e1422] border border-[#1f293d] rounded-3xl shadow-2xl overflow-hidden my-8 animate-fade-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1f293d] flex items-center justify-between bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? t('profile.edit') : t('topbar.newProfile')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('profile.modalSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {(isCheckingDuplicates || duplicateCandidates.length > 0) && (
            <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2 text-amber-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{t('profile.possibleDuplicate')}</p>
                  <p className="text-xs text-amber-200/75">{t('profile.duplicateHint')}</p>
                </div>
              </div>
              {isCheckingDuplicates && duplicateCandidates.length === 0 ? (
                <p className="text-xs text-slate-400">{t('profile.searchingSimilar')}</p>
              ) : (
                <div className="space-y-2">
                  {duplicateCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3 rounded-xl border border-amber-300/20 bg-black/20 p-2.5">
                      <img src={candidate.avatarUrl} alt="" className="w-11 h-11 rounded-lg object-cover bg-slate-800" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{candidate.displayName}</p>
                        <p className="text-xs text-slate-400 truncate">@{candidate.username} · {candidate.reasons.join(' · ')}</p>
                        {candidate.deletedAt && <p className="text-[11px] text-rose-300 mt-0.5">{t('profile.trashDuplicate')}</p>}
                      </div>
                      {candidate.deletedAt && (
                        <button
                          type="button"
                          disabled={restoringDuplicateId === candidate.id}
                          onClick={() => handleRestoreDuplicate(candidate.id)}
                          className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
                        >
                          {restoringDuplicateId === candidate.id ? t('profile.restoring') : t('common.restore')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Row 1: Username & Display Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('profile.usernameRequired')} <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="ornek_kullanici"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#151c2e] border border-[#1f293d] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('profile.nameRequired')} <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('profile.nameExample')}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#151c2e] border border-[#1f293d] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Image Upload / URL Section (Requirement 5) */}
          <div className="p-4 rounded-2xl bg-[#131b2c] border border-[#1f293d] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-400" />
                <span>{t('profile.photo')}</span>
              </label>

              {/* URL vs Upload Toggle Tabs */}
              <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                    imageMode === 'url'
                      ? 'bg-pink-500 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{t('profile.fromUrl')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                    imageMode === 'upload'
                      ? 'bg-pink-500 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('profile.fromComputer')}</span>
                </button>
              </div>
            </div>

            {/* URL Mode */}
            {imageMode === 'url' ? (
              <div className="space-y-2">
                <div className="flex gap-3 items-center">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
                    <img
                      src={avatarUrl || PRESET_AVATARS[0]}
                      alt={t('profile.preview')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => addOrReplaceCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0e1422] border border-[#1f293d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Presets */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                  <span className="text-[11px] text-slate-500 shrink-0">{t('profile.quickPortraits')}</span>
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => addOrReplaceCoverUrl(preset)}
                      className={`w-7 h-7 rounded-lg overflow-hidden shrink-0 border transition ${
                        avatarUrl === preset ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Drag & Drop PC Upload Mode */
              <div className="space-y-3">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-pink-500 bg-pink-500/10'
                      : 'border-slate-700 hover:border-pink-500/60 bg-[#0e1422]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) Array.from(e.target.files).forEach(handleFileUpload);
                    }}
                  />

                  {isUploading ? (
                    <div className="py-2 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-2" />
                      <span className="text-xs text-pink-400 font-medium">{t('profile.uploadingImage')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-pink-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          {t('profile.dropImages')}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {t('profile.imageTypes')}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">{t('profile.reorderImages')}</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {images.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      draggable
                      onDragStart={() => { draggedImageIndex.current = index; }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => moveImage(index)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-900 cursor-grab ${image.isCover ? 'border-pink-500' : 'border-slate-700'}`}
                    >
                      <img src={image.url} alt={t('profile.photoNumber', { number: index + 1 })} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                        <button type="button" onClick={() => setCoverImage(index)} className={`rounded-md px-1.5 py-1 text-[10px] ${image.isCover ? 'bg-pink-500 text-white' : 'bg-black/70 text-white'}`} title={t('profile.makeCover')}>
                          {image.isCover ? `★ ${t('profile.cover')}` : '☆'}
                        </button>
                        <button type="button" onClick={() => removeImage(index)} className="rounded-md bg-black/70 p-1 text-rose-300 hover:bg-rose-500 hover:text-white" title={t('profile.deletePhoto')}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Multiple Platform Links Section (Requirement 2) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>{t('profile.platformLinks')}</span>
                <span className="text-slate-500 font-mono">({links.length})</span>
              </label>

              <div className="flex items-center gap-2">
                {onOpenCreatePlatform && (
                  <button
                    type="button"
                    onClick={onOpenCreatePlatform}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('profile.definePlatform')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAddLinkRow()}
                  className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('profile.addLink')}</span>
                </button>
              </div>
            </div>

            {/* List of Platform Link Rows */}
            <div className="space-y-2">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-[#131b2c] border border-[#1f293d] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  {/* Platform Selector Dropdown */}
                  <select
                    value={link.platformKey}
                    onChange={(e) => handleUpdateLink(idx, { platformKey: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-[#0e1422] border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500 shrink-0 font-medium"
                  >
                    {availablePlatforms.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.icon} {p.name} {p.isCustom ? `(${t('profile.customPlatform')})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* URL Input */}
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleUpdateLink(idx, { url: e.target.value })}
                    placeholder={`https://${link.platformKey === 'website' ? 'ornek.com' : `${link.platformKey}.com/...`}`}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0e1422] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 min-w-0"
                  />

                  {/* Optional Label */}
                  <input
                    type="text"
                    value={link.label || ''}
                    onChange={(e) => handleUpdateLink(idx, { label: e.target.value })}
                    placeholder={t('profile.optionalLabel')}
                    className="w-full sm:w-28 px-3 py-2 rounded-xl bg-[#0e1422] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />

                  {/* Delete Row Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveLinkRow(idx)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition shrink-0"
                    title={t('profile.removeLink')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick add platform chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-500">{t('profile.quickAdd')}</span>
              {availablePlatforms.slice(0, 6).map((p) => (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => handleAddLinkRow(p.key)}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1"
                >
                  <PlatformIcon platform={p.key} iconName={p.icon} size={11} />
                  <span>+{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bio / Quote */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('profile.bioQuote')}
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('profile.bioPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151c2e] border border-[#1f293d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('profile.tags')}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-pink-500/15 text-pink-300 border border-pink-500/30"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder={t('profile.tagInput')}
                className="flex-1 px-3 py-2 rounded-xl bg-[#151c2e] border border-[#1f293d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium"
              >
                {t('common.add')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500">{t('profile.suggestions')}</span>
              {SUGGESTED_TAGS.map((stag) => {
                const isSelected = tags.includes(stag);
                return (
                  <button
                    type="button"
                    key={stag}
                    onClick={() => (isSelected ? handleRemoveTag(stag) : handleAddTag(stag))}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                      isSelected
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {stag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('profile.personalNotes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('profile.personalNotesPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151c2e] border border-[#1f293d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>

          {/* Checkboxes: Favorite & Verified */}
          <div className="pt-2 border-t border-[#1f293d] flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded text-pink-500 focus:ring-pink-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                {t('profile.addFavorite')}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                {t('profile.verified')}
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#1f293d] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition disabled:opacity-50"
            >
              {isSubmitting
                ? 'Kaydediliyor...'
                : isEditing
                ? t('common.save')
                : t('profile.saveProfile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
