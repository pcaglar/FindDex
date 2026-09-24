'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Profile } from '@/types/profile';
import { 
  Heart, 
  Bookmark, 
  ExternalLink, 
  MoreVertical, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Copy, 
  Check,
  Globe,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { getTagStyle, PLATFORM_INFO } from '@/lib/colors';
import { ProfileLightbox } from './ProfileLightbox';
import { useTranslation } from 'react-i18next';

interface ProfileCardProps {
  profile: Profile;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleCollection: (e: React.MouseEvent, collectionName: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelectTag?: (tag: string) => void;
}

export function ProfileCard({
  profile,
  onClick,
  onToggleFavorite,
  onToggleCollection,
  onEdit,
  onDelete,
  onSelectTag,
}: ProfileCardProps) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const galleryImages = useMemo(() => {
    const images = profile.images?.length
      ? [...profile.images].sort((a, b) => a.sortOrder - b.sortOrder)
      : [{ url: profile.avatarUrl, isCover: true, sortOrder: 0 }];
    return images;
  }, [profile.images, profile.avatarUrl]);
  const currentImage = galleryImages[imageIndex] || galleryImages[0];

  useEffect(() => setImageIndex(0), [profile.id, galleryImages.length]);

  const navigateImage = (event: React.MouseEvent, direction: -1 | 1) => {
    event.stopPropagation();
    setImageIndex((current) => (current + direction + galleryImages.length) % galleryImages.length);
  };

  const primaryLink = profile.platformLinks[0];
  const primaryKey = primaryLink?.platformKey || profile.platform || 'website';
  const primaryName = primaryLink?.platformName || 'Website';
  const primaryIcon = primaryLink?.platformIcon || primaryKey;
  const primaryColor = primaryLink?.platformColor;

  const hasWebsite = profile.platformLinks.some((l) => l.platformKey === 'website') || Boolean(profile.websiteUrl);
  const isSavedLater = profile.collections.some((c) => c.toLowerCase() === 'sonra bak');

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const urlToCopy = primaryLink?.url || profile.profileUrl || '';
    if (urlToCopy) {
      navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 1500);
    }
  };

  return (
    <div
      className="group relative flex flex-col rounded-2xl bg-[#111827] border border-[#1f293d] hover:border-pink-500/40 transition-all duration-200 overflow-hidden shadow-lg hover:shadow-pink-500/10"
    >
      {/* Top Cover Image Area */}
      <div
        className="relative aspect-[4/5] sm:aspect-[4/4.5] w-full cursor-zoom-in overflow-hidden bg-slate-900"
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
          loading="lazy"
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Gradient shadow overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-black/40 opacity-80" />

        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => navigateImage(event, -1)}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-2 text-white opacity-100 backdrop-blur-sm transition hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100"
              aria-label={t('profile.previousPhoto')}
            ><ChevronLeft className="w-4 h-4" /></button>
            <button
              type="button"
              onClick={(event) => navigateImage(event, 1)}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-2 text-white opacity-100 backdrop-blur-sm transition hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100"
              aria-label={t('profile.nextPhoto')}
            ><ChevronRight className="w-4 h-4" /></button>
            <div className="absolute bottom-14 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/55 px-2 py-1 backdrop-blur-sm" aria-label={t('profile.photoCount', { count: galleryImages.length })}>
              {galleryImages.map((image, index) => (
                <button
                  type="button"
                  key={image.id || `${image.url}-${index}`}
                  onClick={(event) => { event.stopPropagation(); setImageIndex(index); }}
                  className={`h-1.5 rounded-full transition-all ${index === imageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                  aria-label={t('profile.showPhoto', { number: index + 1 })}
                />
              ))}
            </div>
          </>
        )}

        {/* Top-Right Platform Badges */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md bg-black/60 text-white border border-white/20 shadow-md"
          >
            <PlatformIcon platform={primaryKey} iconName={primaryIcon} className="w-3.5 h-3.5" />
            <span className="capitalize">{primaryName}</span>
          </div>

          {profile.platformLinks.length > 1 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300 border border-pink-500/40 backdrop-blur-md">
              +{profile.platformLinks.length - 1}
            </span>
          )}
        </div>

        {/* Top-Left Website Indicator */}
        {hasWebsite && primaryKey !== 'website' && (
          <div className="absolute top-3 left-3 z-10">
            <span
              title={t('profile.websiteAvailable')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-cyan-300 border border-cyan-500/30 backdrop-blur-md"
            >
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>Web</span>
            </span>
          </div>
        )}

        {/* Information overlay at the bottom of the photo */}
        <div className="absolute bottom-2.5 left-3.5 right-3.5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold !text-white text-base truncate group-hover:!text-pink-300 transition">
              {profile.displayName}
            </h3>
            {profile.isVerified && (
              <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400/20 shrink-0" />
            )}
          </div>
          <p className="text-xs !text-slate-200 font-medium truncate">
            @{profile.username}
          </p>
        </div>
      </div>

      {/* Card Content & Tags */}
      <div
        className="p-3.5 flex-1 flex cursor-pointer flex-col justify-between space-y-2.5"
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={t('profile.openDetails', { name: profile.displayName })}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onClick();
          }
        }}
      >
        {/* Bio / Quote (italic in quotes) */}
        {profile.bio && (
          <p className="text-xs text-slate-400 italic line-clamp-2 leading-relaxed">
            &ldquo;{profile.bio}&rdquo;
          </p>
        )}

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {profile.tags.slice(0, 2).map((tag) => {
            const style = getTagStyle(tag);
            return (
              <button
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTag?.(tag);
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition ${style.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span>{tag}</span>
              </button>
            );
          })}
          {profile.tags.length > 2 && (
            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-md border border-slate-700">
              +{profile.tags.length - 2}
            </span>
          )}
        </div>

        {/* Card Action Bar */}
        <div className="pt-2 border-t border-[#1f293d] flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Heart / Favorite Button */}
            <button
              onClick={onToggleFavorite}
              className={`p-2.5 sm:p-2 rounded-xl transition flex items-center justify-center ${
                profile.isFavorite
                  ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
              title={profile.isFavorite ? t('profile.removeFavorite') : t('profile.addFavorite')}
            >
              <Heart
                className={`w-4 h-4 ${
                  profile.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>

            {/* Bookmark / Sonra Bak toggle */}
            <button
              onClick={(e) => onToggleCollection(e, 'Sonra Bak')}
              className={`p-2.5 sm:p-2 rounded-xl transition flex items-center justify-center ${
                isSavedLater
                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title={isSavedLater ? t('profile.removeWatchLater') : t('profile.addWatchLater')}
            >
              <Bookmark
                className={`w-4 h-4 ${
                  isSavedLater ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </button>

            {/* External Link directly to Profile URL */}
            {primaryLink?.url && (
              <a
                href={primaryLink.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 sm:p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition flex items-center justify-center"
                title={t('profile.openPlatform', { platform: primaryName })}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Three Dots More Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center"
              title={t('profile.more')}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 bottom-full mb-1.5 w-48 rounded-xl bg-[#1a2336] border border-[#2a3752] shadow-2xl p-1 z-40 text-xs text-slate-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/60 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('profile.editProfile')}</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/60 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">{t('profile.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('profile.copyLink')}</span>
                      </>
                    )}
                  </button>

                  <div className="my-1 border-t border-[#2a3752]" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('profile.moveToTrash')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
