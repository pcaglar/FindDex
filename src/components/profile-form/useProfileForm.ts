'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlatformItem, Profile } from '@/types/profile';
import { FormImage, FormLink, PRESET_AVATARS } from './constants';
import { useDuplicateCheck } from './DuplicateWarning';

interface UseProfileFormOptions {
  isOpen: boolean;
  initialData?: Profile | null;
  availablePlatforms: PlatformItem[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  onDuplicateRestored?: () => Promise<void> | void;
}

const GENERATED_URLS: Record<string, (handle: string) => string> = {
  instagram: (handle) => `https://instagram.com/${handle}`,
  twitter: (handle) => `https://x.com/${handle}`,
  tiktok: (handle) => `https://tiktok.com/@${handle}`,
  youtube: (handle) => `https://youtube.com/@${handle}`,
  website: (handle) => `https://${handle}.com`,
};

/** All state and behaviour of the Add/Edit profile form; the components only render it. */
export function useProfileForm({ isOpen, initialData, availablePlatforms, onSave, onClose, onDuplicateRestored }: UseProfileFormOptions) {
  const { t } = useTranslation();
  const isEditing = Boolean(initialData);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [links, setLinks] = useState<FormLink[]>([]);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [images, setImages] = useState<FormImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [bio, setBio] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const duplicates = useDuplicateCheck({
    isOpen, username, displayName, links, excludeId: initialData?.id, onError: setErrorMessage, onRestored: onDuplicateRestored,
  });
  const resetDuplicates = duplicates.reset;

  // (Re)load the form whenever it opens or the profile being edited changes.
  useEffect(() => {
    if (initialData) {
      setUsername(initialData.username || '');
      setDisplayName(initialData.displayName || '');
      const initialImages = initialData.images?.length
        ? initialData.images.map((image, index) => ({ ...image, sortOrder: index }))
        : initialData.avatarUrl ? [{ url: initialData.avatarUrl, isCover: true, sortOrder: 0 }] : [];
      setImages(initialImages);
      setAvatarUrl(initialImages.find((image) => image.isCover)?.url || initialImages[0]?.url || '');
      setImageMode(initialData.avatarUrl?.startsWith('/uploads/') || initialData.avatarUrl?.startsWith('/api/uploads/') ? 'upload' : 'url');
      setBio(initialData.bio || '');
      setNotes(initialData.notes || '');
      setTags(initialData.tags || []);
      setIsFavorite(initialData.isFavorite || false);
      setIsVerified(initialData.isVerified || false);
      setCollections(initialData.collections || []);
      if (initialData.platformLinks?.length) {
        setLinks(initialData.platformLinks.map((link) => ({ platformKey: link.platformKey, url: link.url, label: link.label || undefined })));
      } else {
        const fallback: FormLink[] = [];
        if (initialData.profileUrl) fallback.push({ platformKey: initialData.platform || 'instagram', url: initialData.profileUrl });
        if (initialData.websiteUrl) fallback.push({ platformKey: 'website', url: initialData.websiteUrl, label: 'Website' });
        setLinks(fallback.length ? fallback : [{ platformKey: 'instagram', url: '' }]);
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
      setLinks([{ platformKey: 'instagram', url: '' }]);
    }
    setErrorMessage('');
    resetDuplicates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, isOpen]);

  // Typing a username fills in the first (empty) link for new profiles.
  const changeUsername = (value: string) => {
    setUsername(value);
    const handle = value.replace(/^@/, '').trim();
    if (!isEditing && handle && links.length === 1 && !links[0].url) {
      const generated = GENERATED_URLS[links[0].platformKey]?.(handle);
      if (generated) setLinks([{ ...links[0], url: generated }]);
    }
  };

  const addLink = (platformKey?: string) => setLinks((current) => [...current, { platformKey: platformKey || availablePlatforms[0]?.key || 'instagram', url: '' }]);
  const updateLink = (index: number, patch: Partial<FormLink>) => setLinks((current) => current.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  const removeLink = (index: number) => setLinks((current) => current.filter((_, i) => i !== index));

  // ---- images ----
  const changeAvatarUrl = (url: string) => {
    setAvatarUrl(url);
    if (!url.trim()) return;
    setImages((current) => current.length ? current.map((image) => image.isCover ? { ...image, url } : image) : [{ url, isCover: true, sortOrder: 0 }]);
  };

  const addUploadedImage = (url: string) => {
    setImages((current) => {
      if (current.some((image) => image.url === url)) return current;
      const onlyDefaultPreset = current.length === 1 && PRESET_AVATARS.includes(current[0].url);
      const base = onlyDefaultPreset ? [] : current;
      const next = [...base, { url, isCover: base.length === 0, sortOrder: base.length }];
      setAvatarUrl((next.find((image) => image.isCover) || next[0]).url);
      return next;
    });
  };

  const setCover = (index: number) => {
    setImages((current) => current.map((image, i) => ({ ...image, isCover: i === index })));
    setAvatarUrl((current) => images[index]?.url || current);
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      const removedWasCover = current[index]?.isCover;
      const next = current.filter((_, i) => i !== index).map((image, i) => ({ ...image, sortOrder: i }));
      if (removedWasCover && next.length) next[0] = { ...next[0], isCover: true };
      setAvatarUrl(next.find((image) => image.isCover)?.url || next[0]?.url || '');
      return next;
    });
  };

  const moveImage = (from: number, to: number) => {
    if (from === to) return;
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((image, i) => ({ ...image, sortOrder: i }));
    });
  };

  const addTag = (tag: string) => { const clean = tag.trim(); if (clean) setTags((current) => current.includes(clean) ? current : [...current, clean]); };
  const removeTag = (tag: string) => setTags((current) => current.filter((item) => item !== tag));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !displayName.trim()) { setErrorMessage(t('profile.validationRequired')); return; }

    const validLinks = links.filter((link) => link.url.trim().length > 0);
    if (validLinks.length === 0) {
      validLinks.push({ platformKey: 'instagram', url: `https://instagram.com/${username.replace(/^@/, '').trim()}` });
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
      const code = err instanceof Error && 'code' in err ? String(err.code) : '';
      const messageByCode: Record<string, string> = {
        INVALID_IMAGE_URL: t('profile.invalidImageUrl'),
        IMAGE_DOWNLOAD_TIMEOUT: t('profile.imageDownloadTimeout'),
        IMAGE_DOWNLOAD_FAILED: t('profile.imageDownloadFailed'),
        IMAGE_TOO_LARGE: t('profile.imageTooLarge'),
        UNSUPPORTED_IMAGE: t('profile.unsupportedImage'),
      };
      setErrorMessage(messageByCode[code] || (err instanceof Error ? err.message : t('profile.saveFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isEditing, errorMessage, setErrorMessage, isSubmitting, isUploading, setIsUploading, duplicates,
    username, displayName, setDisplayName, changeUsername,
    links, addLink, updateLink, removeLink,
    imageMode, setImageMode, avatarUrl, images, changeAvatarUrl, addUploadedImage, setCover, removeImage, moveImage,
    bio, setBio, notes, setNotes, tags, addTag, removeTag,
    isFavorite, setIsFavorite, isVerified, setIsVerified, submit,
  };
}
