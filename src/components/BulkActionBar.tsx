'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderMinus, FolderPlus, Heart, HeartOff, Hash, Tag, Trash2, X } from 'lucide-react';
import type { BulkAction } from '@/lib/bulkTypes';

type PickerMode = 'addTags' | 'removeTags' | 'addCollections' | 'removeCollections';
type NameOption = { id: string; name: string };

interface BulkActionBarProps {
  count: number;
  busy: boolean;
  tagOptions: NameOption[];
  collectionOptions: NameOption[];
  onSelectPage: () => void;
  onClear: () => void;
  onDone: () => void;
  onRun: (action: BulkAction, values?: { tags?: string[]; collections?: string[] }) => void;
  onRequestTrash: () => void;
}

const MODE_ICONS = { addTags: Hash, removeTags: Tag, addCollections: FolderPlus, removeCollections: FolderMinus } as const;

export function BulkActionBar({ count, busy, tagOptions, collectionOptions, onSelectPage, onClear, onDone, onRun, onRequestTrash }: BulkActionBarProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PickerMode | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setChosen([]); setDraft(''); }, [mode]);
  useEffect(() => {
    if (!mode) return;
    const close = (event: MouseEvent) => { if (!barRef.current?.contains(event.target as Node)) setMode(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [mode]);

  const isTags = mode === 'addTags' || mode === 'removeTags';
  const isAdding = mode === 'addTags' || mode === 'addCollections';
  const options = (isTags ? tagOptions : collectionOptions).map((option) => option.name);
  const visible = Array.from(new Set([...options, ...chosen]));

  const toggleChoice = (name: string) => setChosen((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const commitDraft = () => {
    const name = draft.trim();
    if (!name) return;
    setChosen((current) => current.includes(name) ? current : [...current, name]);
    setDraft('');
  };
  const apply = () => {
    if (!mode || !chosen.length) return;
    onRun(mode, isTags ? { tags: chosen } : { collections: chosen });
    setMode(null);
  };

  const button = 'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50';
  const pickers: { mode: PickerMode; label: string }[] = [
    { mode: 'addTags', label: t('bulk.addTags') },
    { mode: 'removeTags', label: t('bulk.removeTags') },
    { mode: 'addCollections', label: t('bulk.addCollections') },
    { mode: 'removeCollections', label: t('bulk.removeCollections') },
  ];

  return (
    <div ref={barRef} className="fixed inset-x-3 bottom-4 z-40 mx-auto w-fit max-w-[calc(100vw-1.5rem)]" role="toolbar" aria-label={t('bulk.selectedCount', { count })}>
      {mode && (
        <div className="mb-2 w-[min(26rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-700 bg-[#0e1422] p-3 shadow-2xl">
          <p className="mb-2 text-xs font-bold text-slate-200">{t(`bulk.${mode}`)}</p>
          <div className="mb-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto scrollbar-thin">
            {visible.length === 0 && <span className="text-xs text-slate-500">{t('bulk.chooseNames')}</span>}
            {visible.map((name) => {
              const active = chosen.includes(name);
              return (
                <button key={name} type="button" onClick={() => toggleChoice(name)} aria-pressed={active}
                  className={`rounded-md border px-2 py-1 text-[11px] transition ${active ? 'border-pink-500/50 bg-pink-500/20 text-pink-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'}`}>
                  {name}
                </button>
              );
            })}
          </div>
          {isAdding && (
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitDraft(); } }}
              placeholder={isTags ? t('bulk.tagPlaceholder') : t('bulk.collectionPlaceholder')}
              className="mb-2 w-full rounded-lg border border-[#1f293d] bg-[#151c2e] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none"
            />
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode(null)} className={`${button} text-slate-400 hover:text-white`}>{t('common.cancel')}</button>
            <button type="button" disabled={!chosen.length || busy} onClick={apply} className={`${button} bg-pink-500 text-white hover:bg-pink-600`}>{t('bulk.apply')}</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-[#111827]/95 p-2 shadow-2xl backdrop-blur">
        <span className="px-2 text-xs font-bold text-white">{t('bulk.selectedCount', { count })}</span>
        <button type="button" onClick={onSelectPage} className={`${button} text-slate-300 hover:bg-slate-800`}>{t('bulk.selectPage')}</button>
        <button type="button" onClick={onClear} disabled={count === 0} className={`${button} text-slate-300 hover:bg-slate-800`}>{t('bulk.clearSelection')}</button>
        <span className="mx-1 hidden h-5 w-px bg-slate-700 sm:block" />
        <button type="button" disabled={busy || count === 0} onClick={() => onRun('favorite')} className={`${button} text-rose-300 hover:bg-rose-500/10`}><Heart className="h-3.5 w-3.5" />{t('bulk.favorite')}</button>
        <button type="button" disabled={busy || count === 0} onClick={() => onRun('unfavorite')} className={`${button} text-slate-300 hover:bg-slate-800`}><HeartOff className="h-3.5 w-3.5" />{t('bulk.unfavorite')}</button>
        {pickers.map(({ mode: pickerMode, label }) => {
          const Icon = MODE_ICONS[pickerMode];
          return (
            <button key={pickerMode} type="button" disabled={busy || count === 0} onClick={() => setMode(mode === pickerMode ? null : pickerMode)} aria-expanded={mode === pickerMode}
              className={`${button} ${mode === pickerMode ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>
          );
        })}
        <button type="button" disabled={busy || count === 0} onClick={onRequestTrash} className={`${button} text-rose-400 hover:bg-rose-500/10`}><Trash2 className="h-3.5 w-3.5" />{t('bulk.moveToTrash')}</button>
        <span className="mx-1 hidden h-5 w-px bg-slate-700 sm:block" />
        <button type="button" onClick={onDone} className={`${button} bg-slate-800 text-white hover:bg-slate-700`}><X className="h-3.5 w-3.5" />{t('bulk.done')}</button>
      </div>
    </div>
  );
}
