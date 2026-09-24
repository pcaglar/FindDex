'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Profile } from '@/types/profile';
import { 
  Heart, 
  Bookmark, 
  ExternalLink, 
  CheckCircle2, 
  Trash2, 
  Edit3,
  Globe,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { getTagStyle } from '@/lib/colors';
import { ProfileLightbox } from './ProfileLightbox';
import { useTranslation } from 'react-i18next';

interface ProfileListItemProps {
  profile: Profile;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleCollection: (e: React.MouseEvent, collectionName: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelectTag?: (tag: string) => void;
}

export function ProfileListItem({
  profile,
  onClick,
  onToggleFavorite,
  onToggleCollection,
  onEdit,
  onDelete,
  onSelectTag,
}: ProfileListItemProps) {
  const { t } = useTranslation();
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const galleryImages = useMemo(() => profile.images?.length
    ? [...profile.images].sort((a, b) => a.sortOrder - b.sortOrder)
    : [{ url: profile.avatarUrl, isCover: true, sortOrder: 0 }], [profile.images, profile.avatarUrl]);
  const currentImage = galleryImages[imageIndex] || galleryImages[0];

  useEffect(() => setImageIndex(0), [profile.id, galleryImages.length]);

  const navigateImage = (event: React.MouseEvent, direction: -1 | 1) => {
    event.stopPropagation();
    setImageIndex((current) => (current + direction + galleryImages.length) % galleryImages.length);
  };
  const primaryLink = profile.platformLinks[0];
  const primaryKey = primaryLink?.platformKey || profile.platform || 'website';
  const primaryName = primaryLink?.platformName || 'Website';
  const isSavedLater = profile.collections.some((c) => c.toLowerCase() === 'sonra bak');

  return (
    <div
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#111827] border border-[#1f293d] hover:border-pink-500/40 transition shadow-md hover:shadow-pink-500/5 gap-3"
    >
      {/* Left: Avatar + Details */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="relative w-14 h-14 sm:w-16 sm:h-16 cursor-zoom-in rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-slate-800"
          onClick={(event) => {
            event.stopPropagation();
            setLightboxIndex(imageIndex);
          }}
          role="button"
          tabIndex={0}
          aria-label={t('profile.openGallery', { name: profile.displayName })}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              setLightboxIndex(imageIndex);
            }
          }}
        >
          <img
            src={currentImage.url}
            alt={profile.displayName}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
            }}
          />
          {galleryImages.length > 1 && (
            <>
              <button type="button" onClick={(event) => navigateImage(event, -1)} className="absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-black/65 p-0.5 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100" aria-label={t('profile.previousPhoto')}><ChevronLeft className="w-3 h-3" /></button>
              <button type="button" onClick={(event) => navigateImage(event, 1)} className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full bg-black/65 p-0.5 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100" aria-label={t('profile.nextPhoto')}><ChevronRight className="w-3 h-3" /></button>
              <div className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
                {galleryImages.map((image, index) => <span key={image.id || `${image.url}-${index}`} className={`h-1 rounded-full ${index === imageIndex ? 'w-2.5 bg-white' : 'w-1 bg-white/55'}`} />)}
              </div>
            </>
          )}
        </div>

        <div
          className="min-w-0 flex-1 cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/70"
          onClick={onClick}
          role="button"
          tabIndex={0}
          aria-label={t('profile.openDetails', { name: profile.displayName })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClick();
            }
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-pink-300 transition">
              {profile.displayName}
            </h3>
            {profile.isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}

            {/* Platform Badges */}
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {profile.platformLinks.map((pl, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700"
                >
                  <PlatformIcon platform={pl.platformKey} iconName={pl.platformIcon} size={11} />
                  <span>{pl.platformName}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="font-medium text-slate-300">@{profile.username}</span>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {profile.tags.slice(0, 3).map((tag) => {
              const style = getTagStyle(tag);
              return (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTag?.(tag);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${style.bg}`}
                >
                  <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1f293d]">
        <button
          onClick={onToggleFavorite}
          className={`p-2.5 rounded-xl transition ${
            profile.isFavorite
              ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
              : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
          }`}
          title={profile.isFavorite ? t('profile.removeFavorite') : t('profile.addFavorite')}
        >
          <Heart
            className={`w-4 h-4 ${profile.isFavorite ? 'fill-rose-500' : ''}`}
          />
        </button>

        <button
          onClick={(e) => onToggleCollection(e, 'Sonra Bak')}
          className={`p-2.5 rounded-xl transition ${
            isSavedLater
              ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
              : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
          }`}
          title={t('sidebar.watchLater')}
        >
          <Bookmark
            className={`w-4 h-4 ${isSavedLater ? 'fill-amber-400' : ''}`}
          />
        </button>

        {primaryLink?.url && (
          <a
            href={primaryLink.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
            title={t('profile.openProfile')}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={t('common.edit')}
        >
          <Edit3 className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          title={t('profile.moveToTrash')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {lightboxIndex !== null && (
        <ProfileLightbox
          images={galleryImages}
          initialIndex={lightboxIndex}
          profileName={profile.displayName}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
