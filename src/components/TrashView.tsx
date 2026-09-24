'use client';

import React, { useState } from 'react';
import { Profile } from '@/types/profile';
import { useTranslation } from 'react-i18next';
import { 
  RotateCcw, 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  ExternalLink, 
  Clock,
  Sparkles 
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { currentLanguage, formatDateTime } from '@/i18n/format';

interface TrashViewProps {
  trashedProfiles: Profile[];
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
  onClose: () => void;
}

export function TrashView({
  trashedProfiles,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  onClose,
}: TrashViewProps) {
  const { t, i18n } = useTranslation();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [candidateDeleteId, setCandidateDeleteId] = useState<string | null>(null);

  const formatDate = (isoString?: string | null) => isoString ? formatDateTime(isoString, currentLanguage(i18n.language)) : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{t('trash.title')}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                {t('trash.profileCount', { count: trashedProfiles.length })}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('trash.description')}
            </p>
          </div>
        </div>

        {trashedProfiles.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {confirmEmpty ? (
              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-rose-500/40">
                <span className="text-xs text-rose-400 px-2 font-medium">{t('trash.areYouSure')}</span>
                <button
                  onClick={async () => {
                    await onEmptyTrash();
                    setConfirmEmpty(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                >
                  {t('trash.confirmEmpty')}
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('trash.emptyTrash')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Trashed Profiles List */}
      {trashedProfiles.length === 0 ? (
        <div className="py-20 rounded-3xl bg-[#111827]/40 border border-[#1f293d] flex flex-col items-center justify-center text-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-emerald-400 mb-4 shadow-lg">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">{t('trash.empty')}</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-5">
            {t('trash.emptyDescription')}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            {t('trash.backToArchive')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trashedProfiles.map((p) => {
            const isConfirmingDelete = candidateDeleteId === p.id;
            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-[#111827] border border-[#1f293d] hover:border-slate-700 flex flex-col justify-between gap-3 transition shadow-md"
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-slate-800">
                    <img
                      src={p.avatarUrl}
                      alt={p.displayName}
                      className="w-full h-full object-cover grayscale opacity-75"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{p.displayName}</h4>
                    <p className="text-xs text-pink-400/80 font-medium truncate">@{p.username}</p>

                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3 text-rose-400" />
                      <span>{t('trash.deletedAt', { date: formatDate(p.deletedAt) })}</span>
                    </div>

                    {/* Platform links tags */}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {p.platformLinks.map((pl, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700"
                        >
                          <PlatformIcon platform={pl.platformKey} iconName={pl.platformIcon} size={11} />
                          <span>{pl.platformName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="pt-3 border-t border-[#1f293d] flex items-center justify-between gap-2">
                  <button
                    onClick={() => onRestore(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('trash.restore')}</span>
                  </button>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          await onPermanentDelete(p.id);
                          setCandidateDeleteId(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                      >
                        {t('trash.deleteForever')}
                      </button>
                      <button
                        onClick={() => setCandidateDeleteId(null)}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCandidateDeleteId(p.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title={t('trash.deleteForever')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('trash.deleteForever')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
