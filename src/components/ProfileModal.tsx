'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Heart, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PlatformItem, Profile } from '@/types/profile';
import { DuplicateWarning } from './profile-form/DuplicateWarning';
import { PhotoSection } from './profile-form/PhotoSection';
import { PlatformLinksSection } from './profile-form/PlatformLinksSection';
import { TagsSection } from './profile-form/TagsSection';
import { FIELD_CLASS } from './profile-form/constants';
import { useProfileForm } from './profile-form/useProfileForm';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: Profile | null;
  availablePlatforms: PlatformItem[];
  onOpenCreatePlatform?: () => void;
  onDuplicateRestored?: () => Promise<void> | void;
}

export function ProfileModal({ isOpen, onClose, onSave, initialData, availablePlatforms, onOpenCreatePlatform, onDuplicateRestored }: ProfileModalProps) {
  const { t } = useTranslation();
  const form = useProfileForm({ isOpen, initialData, availablePlatforms, onSave, onClose, onDuplicateRestored });
  const { duplicates } = form;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0e1422] border border-[#1f293d] rounded-3xl shadow-2xl overflow-hidden my-8 animate-fade-in">
        <div className="px-6 py-5 border-b border-[#1f293d] flex items-center justify-between bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{form.isEditing ? t('profile.edit') : t('topbar.newProfile')}</h2>
              <p className="text-xs text-slate-400">{t('profile.modalSubtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition" aria-label={t('common.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {form.errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{form.errorMessage}</span>
          </div>
        )}

        <form onSubmit={form.submit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
          <DuplicateWarning candidates={duplicates.candidates} checking={duplicates.checking} restoringId={duplicates.restoringId} onRestore={duplicates.restore} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('profile.usernameRequired')} <span className="text-pink-500">*</span></label>
              <input type="text" value={form.username} onChange={(event) => form.changeUsername(event.target.value)} placeholder={t('profile.usernamePlaceholder')} required className={`${FIELD_CLASS} text-sm`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('profile.nameRequired')} <span className="text-pink-500">*</span></label>
              <input type="text" value={form.displayName} onChange={(event) => form.setDisplayName(event.target.value)} placeholder={t('profile.nameExample')} required className={`${FIELD_CLASS} text-sm`} />
            </div>
          </div>

          <PhotoSection
            imageMode={form.imageMode}
            onImageModeChange={form.setImageMode}
            avatarUrl={form.avatarUrl}
            images={form.images}
            onAvatarUrlChange={form.changeAvatarUrl}
            onSetCover={form.setCover}
            onRemove={form.removeImage}
            onMove={form.moveImage}
            onUploaded={form.addUploadedImage}
            onError={form.setErrorMessage}
            onBusyChange={form.setIsUploading}
            isUploading={form.isUploading}
          />

          <PlatformLinksSection
            links={form.links}
            platforms={availablePlatforms}
            onAdd={form.addLink}
            onUpdate={form.updateLink}
            onRemove={form.removeLink}
            onOpenCreatePlatform={onOpenCreatePlatform}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('profile.bioQuote')}</label>
            <input type="text" value={form.bio} onChange={(event) => form.setBio(event.target.value)} placeholder={t('profile.bioPlaceholder')} className={`${FIELD_CLASS} text-xs`} />
          </div>

          <TagsSection tags={form.tags} onAdd={form.addTag} onRemove={form.removeTag} />

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('profile.personalNotes')}</label>
            <textarea rows={2} value={form.notes} onChange={(event) => form.setNotes(event.target.value)} placeholder={t('profile.personalNotesPlaceholder')} className={`${FIELD_CLASS} text-xs resize-none`} />
          </div>

          <div className="pt-2 border-t border-[#1f293d] flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isFavorite} onChange={(event) => form.setIsFavorite(event.target.checked)} className="rounded text-pink-500 focus:ring-pink-500 bg-slate-900 border-slate-700" />
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" />{t('profile.addFavorite')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isVerified} onChange={(event) => form.setIsVerified(event.target.checked)} className="rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-700" />
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />{t('profile.verified')}</span>
            </label>
          </div>

          <div className="pt-4 border-t border-[#1f293d] flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition">{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={form.isSubmitting || form.isUploading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition disabled:opacity-50"
            >
              {form.isSubmitting ? t('common.saving') : form.isEditing ? t('common.save') : t('profile.saveProfile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
