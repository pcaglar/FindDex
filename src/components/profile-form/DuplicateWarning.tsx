'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThumbImage } from '../ThumbImage';
import type { FormLink } from './constants';

export interface DuplicateCandidate {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  deletedAt: string | null;
  reasons: string[];
}

interface UseDuplicateCheckOptions {
  isOpen: boolean;
  username: string;
  displayName: string;
  links: FormLink[];
  excludeId?: string;
  onError: (message: string) => void;
  onRestored?: () => Promise<void> | void;
}

/** Looks for existing profiles that match what is being typed (debounced), and restores trashed matches. */
export function useDuplicateCheck({ isOpen, username, displayName, links, excludeId, onError, onRestored }: UseDuplicateCheckOptions) {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [checking, setChecking] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => { if (!isOpen) setCandidates([]); }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const meaningfulInput = username.trim() || displayName.trim() || links.some((link) => link.url.trim());
    if (!meaningfulInput) { setCandidates([]); return; }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (username.trim()) params.set('username', username);
      if (displayName.trim()) params.set('name', displayName);
      links.forEach((link) => link.url.trim() && params.append('url', link.url.trim()));
      if (excludeId) params.set('excludeId', excludeId);
      setChecking(true);
      try {
        const response = await fetch(`/api/profiles/duplicates?${params.toString()}`, { signal: controller.signal });
        const result = await response.json();
        if (result.success) setCandidates(result.data);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.error('Duplicate check failed', error);
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 500);

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [username, displayName, links, excludeId, isOpen]);

  const restore = async (id: string) => {
    setRestoringId(id);
    try {
      const response = await fetch(`/api/trash/${id}`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || t('errors.generic'));
      setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, deletedAt: null } : candidate));
      await onRestored?.();
    } catch (error) {
      onError(error instanceof Error ? error.message : t('errors.generic'));
    } finally {
      setRestoringId(null);
    }
  };

  return { candidates, checking, restoringId, restore, reset: () => setCandidates([]) };
}

interface DuplicateWarningProps {
  candidates: DuplicateCandidate[];
  checking: boolean;
  restoringId: string | null;
  onRestore: (id: string) => void;
}

export function DuplicateWarning({ candidates, checking, restoringId, onRestore }: DuplicateWarningProps) {
  const { t } = useTranslation();
  if (!checking && candidates.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-start gap-2 text-amber-200">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{t('profile.possibleDuplicate')}</p>
          <p className="text-xs text-amber-200/75">{t('profile.duplicateHint')}</p>
        </div>
      </div>
      {checking && candidates.length === 0 ? (
        <p className="text-xs text-slate-400">{t('profile.searchingSimilar')}</p>
      ) : (
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="flex items-center gap-3 rounded-xl border border-amber-300/20 bg-black/20 p-2.5">
              <ThumbImage src={candidate.avatarUrl} alt="" placeholder={false} className="w-11 h-11 rounded-lg object-cover bg-slate-800" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{candidate.displayName}</p>
                <p className="text-xs text-slate-400 truncate">
                  @{candidate.username} · {candidate.reasons.map((reason) => t(`profile.duplicateReason.${reason}`, { defaultValue: reason })).join(' · ')}
                </p>
                {candidate.deletedAt && <p className="text-[11px] text-rose-300 mt-0.5">{t('profile.trashDuplicate')}</p>}
              </div>
              {candidate.deletedAt && (
                <button
                  type="button"
                  disabled={restoringId === candidate.id}
                  onClick={() => onRestore(candidate.id)}
                  className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
                >
                  {restoringId === candidate.id ? t('profile.restoring') : t('common.restore')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
