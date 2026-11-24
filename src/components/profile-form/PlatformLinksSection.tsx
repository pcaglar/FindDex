'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PlatformItem } from '@/types/profile';
import { PlatformIcon } from '../PlatformIcon';
import type { FormLink } from './constants';

interface PlatformLinksSectionProps {
  links: FormLink[];
  platforms: PlatformItem[];
  onAdd: (platformKey?: string) => void;
  onUpdate: (index: number, patch: Partial<FormLink>) => void;
  onRemove: (index: number) => void;
  onOpenCreatePlatform?: () => void;
}

export function PlatformLinksSection({ links, platforms, onAdd, onUpdate, onRemove, onOpenCreatePlatform }: PlatformLinksSectionProps) {
  const { t } = useTranslation();
  const inputClass = 'rounded-xl bg-[#0e1422] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>{t('profile.platformLinks')}</span>
          <span className="text-slate-500 font-mono">({links.length})</span>
        </label>
        <div className="flex items-center gap-2">
          {onOpenCreatePlatform && (
            <button type="button" onClick={onOpenCreatePlatform} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition">
              <Plus className="w-3 h-3" /><span>{t('profile.definePlatform')}</span>
            </button>
          )}
          <button type="button" onClick={() => onAdd()} className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold transition">
            <Plus className="w-3.5 h-3.5" /><span>{t('profile.addLink')}</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={index} className="p-3 rounded-2xl bg-[#131b2c] border border-[#1f293d] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <select value={link.platformKey} onChange={(event) => onUpdate(index, { platformKey: event.target.value })} className={`px-3 py-2 ${inputClass} shrink-0 font-medium`}>
              {platforms.map((platform) => (
                <option key={platform.key} value={platform.key}>
                  {platform.icon} {platform.name} {platform.isCustom ? `(${t('profile.customPlatform')})` : ''}
                </option>
              ))}
            </select>
            <input
              type="url"
              value={link.url}
              onChange={(event) => onUpdate(index, { url: event.target.value })}
              placeholder={`https://${link.platformKey === 'website' ? t('profile.websitePlaceholder') : `${link.platformKey}.com/...`}`}
              className={`flex-1 px-3 py-2 ${inputClass} min-w-0`}
            />
            <input
              type="text"
              value={link.label || ''}
              onChange={(event) => onUpdate(index, { label: event.target.value })}
              placeholder={t('profile.optionalLabel')}
              className={`w-full sm:w-28 px-3 py-2 ${inputClass}`}
            />
            <button type="button" onClick={() => onRemove(index)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition shrink-0" title={t('profile.removeLink')}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-[11px] text-slate-500">{t('profile.quickAdd')}</span>
        {platforms.slice(0, 6).map((platform) => (
          <button type="button" key={platform.key} onClick={() => onAdd(platform.key)} className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1">
            <PlatformIcon platform={platform.key} iconName={platform.icon} size={11} />
            <span>+{platform.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
