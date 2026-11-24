'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUGGESTED_TAGS } from './constants';

interface TagsSectionProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

export function TagsSection({ tags, onAdd, onRemove }: TagsSectionProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const commit = () => { if (draft.trim()) onAdd(draft.trim()); setDraft(''); };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('profile.tags')}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-pink-500/15 text-pink-300 border border-pink-500/30">
            <span>{tag}</span>
            <button type="button" onClick={() => onRemove(tag)} className="hover:text-white" aria-label={t('filters.removeTag', { name: tag })}><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }}
          placeholder={t('profile.tagInput')}
          className="flex-1 px-3 py-2 rounded-xl bg-[#151c2e] border border-[#1f293d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
        />
        <button type="button" onClick={commit} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium">{t('common.add')}</button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-slate-500">{t('profile.suggestions')}</span>
        {SUGGESTED_TAGS.map((suggestion) => {
          const isSelected = tags.includes(suggestion);
          return (
            <button
              type="button"
              key={suggestion}
              onClick={() => (isSelected ? onRemove(suggestion) : onAdd(suggestion))}
              className={`text-[10px] px-2 py-0.5 rounded-md border transition ${isSelected ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'}`}
            >
              {suggestion}
            </button>
          );
        })}
      </div>
    </div>
  );
}
