'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ProfileImageItem } from '@/types/profile';
import { useTranslation } from 'react-i18next';

interface ProfileLightboxProps {
  images: ProfileImageItem[];
  initialIndex: number;
  profileName: string;
  onClose: () => void;
}

export function ProfileLightbox({ images, initialIndex, profileName, onClose }: ProfileLightboxProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
  }, [initialIndex, images.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (images.length > 1 && event.key === 'ArrowLeft') {
        setIndex((current) => (current - 1 + images.length) % images.length);
      }
      if (images.length > 1 && event.key === 'ArrowRight') {
        setIndex((current) => (current + 1) % images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [images.length, onClose]);

  if (!mounted || images.length === 0) return null;

  const move = (direction: -1 | 1) => {
    setIndex((current) => (current + direction + images.length) % images.length);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('profile.gallery', { name: profileName })}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-black/55 p-2.5 text-white transition hover:bg-white/15 sm:right-6 sm:top-6"
        aria-label={t('profile.closeGallery')}
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 p-2.5 text-white transition hover:bg-white/15 sm:left-6 sm:p-3"
            aria-label={t('profile.previousPhoto')}
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 p-2.5 text-white transition hover:bg-white/15 sm:right-6 sm:p-3"
            aria-label={t('profile.nextPhoto')}
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </>
      )}

      <div className="flex h-full w-full max-w-6xl flex-col items-center justify-center gap-4" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <img
            src={images[index]?.url}
            alt={t('profile.photoAlt', { name: profileName, number: index + 1 })}
            className="max-h-[calc(100vh-8.5rem)] max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>

        {images.length > 1 && (
          <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-xl border border-white/10 bg-black/45 p-2 scrollbar-thin">
            {images.map((image, thumbnailIndex) => (
              <button
                type="button"
                key={image.id || `${image.url}-${thumbnailIndex}`}
                onClick={() => setIndex(thumbnailIndex)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                  thumbnailIndex === index ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                aria-label={t('profile.showPhoto', { number: thumbnailIndex + 1 })}
              >
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <span className="text-xs font-medium text-white/70">{index + 1} / {images.length}</span>
      </div>
    </div>,
    document.body,
  );
}
