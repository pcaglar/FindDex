'use client';

import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Link as LinkIcon, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThumbImage } from '../ThumbImage';
import { FormImage, MAX_UPLOAD_BYTES, PRESET_AVATARS, VALID_UPLOAD_TYPES } from './constants';

interface PhotoSectionProps {
  imageMode: 'url' | 'upload';
  onImageModeChange: (mode: 'url' | 'upload') => void;
  avatarUrl: string;
  images: FormImage[];
  onAvatarUrlChange: (url: string) => void;
  onSetCover: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  /** Called with the stored URL once a file has been uploaded. */
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
  isUploading: boolean;
}

export function PhotoSection(props: PhotoSectionProps) {
  const { t } = useTranslation();
  const { imageMode, avatarUrl, images, isUploading } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggedIndex = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = async (file: File) => {
    if (!VALID_UPLOAD_TYPES.includes(file.type.toLowerCase())) { props.onError(t('profile.unsupportedImage')); return; }
    if (file.size > MAX_UPLOAD_BYTES) { props.onError(t('profile.imageTooLarge')); return; }
    props.onBusyChange(true);
    props.onError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) props.onUploaded(result.url);
      else props.onError(result.error || t('profile.uploadFailed'));
    } catch {
      props.onError(t('profile.uploadServerError'));
    } finally {
      props.onBusyChange(false);
    }
  };

  const modeButton = (mode: 'url' | 'upload', label: string, Icon: typeof LinkIcon) => (
    <button
      type="button"
      onClick={() => props.onImageModeChange(mode)}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${imageMode === mode ? 'bg-pink-500 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="p-4 rounded-2xl bg-[#131b2c] border border-[#1f293d] space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-pink-400" />
          <span>{t('profile.photo')}</span>
        </label>
        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5 text-xs">
          {modeButton('url', t('profile.fromUrl'), LinkIcon)}
          {modeButton('upload', t('profile.fromComputer'), Upload)}
        </div>
      </div>

      {imageMode === 'url' ? (
        <div className="space-y-2">
          <div className="flex gap-3 items-center">
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
              <ThumbImage src={avatarUrl || PRESET_AVATARS[0]} alt={t('profile.preview')} className="w-full h-full object-cover" />
            </div>
            <input
              type="url"
              value={avatarUrl}
              onChange={(event) => props.onAvatarUrlChange(event.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0e1422] border border-[#1f293d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            <span className="text-[11px] text-slate-500 shrink-0">{t('profile.quickPortraits')}</span>
            {PRESET_AVATARS.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => props.onAvatarUrlChange(preset)}
                className={`w-7 h-7 rounded-lg overflow-hidden shrink-0 border transition ${avatarUrl === preset ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-slate-700 opacity-60 hover:opacity-100'}`}
              >
                <img src={preset} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (event.dataTransfer.files?.length) Array.from(event.dataTransfer.files).forEach(uploadFile);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${isDragging ? 'border-pink-500 bg-pink-500/10' : 'border-slate-700 hover:border-pink-500/60 bg-[#0e1422]'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => { if (event.target.files?.length) Array.from(event.target.files).forEach(uploadFile); }}
            />
            {isUploading ? (
              <div className="py-2 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-2" />
                <span className="text-xs text-pink-400 font-medium">{t('profile.uploadingImage')}</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-pink-400"><Upload className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{t('profile.dropImages')}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t('profile.imageTypes')}</p>
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
                onDragStart={() => { draggedIndex.current = index; }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedIndex.current !== null) props.onMove(draggedIndex.current, index);
                  draggedIndex.current = null;
                }}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-900 cursor-grab ${image.isCover ? 'border-pink-500' : 'border-slate-700'}`}
              >
                <ThumbImage src={image.url} alt={t('profile.photoNumber', { number: index + 1 })} placeholder={false} className="w-full h-full object-cover" />
                <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                  <button type="button" onClick={() => props.onSetCover(index)} className={`rounded-md px-1.5 py-1 text-[10px] ${image.isCover ? 'bg-pink-500 text-white' : 'bg-black/70 text-white'}`} title={t('profile.makeCover')}>
                    {image.isCover ? `★ ${t('profile.cover')}` : '☆'}
                  </button>
                  <button type="button" onClick={() => props.onRemove(index)} className="rounded-md bg-black/70 p-1 text-rose-300 hover:bg-rose-500 hover:text-white" title={t('profile.deletePhoto')}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
