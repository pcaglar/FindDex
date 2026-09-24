'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Check, Pencil } from 'lucide-react';
import { PlatformItem } from '@/types/profile';
import { useTranslation } from 'react-i18next';

interface CustomPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (platform: PlatformItem) => void;
  onUpdated?: (platform: PlatformItem) => void;
  editData?: PlatformItem | null; // edit mode when provided
}

const EMOJI_OPTIONS = [
  '🔒', '🎨', '🌲', '👻', '🎮', '🧵', '💬', '📌', '💎', '👑', '⭐', '🎥', '📸', '🎵', '🔗', '✨'
];

const PRESET_SUGGESTIONS = [
  { name: 'OnlyFans', icon: '🔒', color: 'from-sky-500 to-blue-600' },
  { name: 'Patreon', icon: '🎨', color: 'from-orange-500 to-rose-600' },
  { name: 'Linktree', icon: '🌲', color: 'from-emerald-500 to-teal-600' },
  { name: 'Snapchat', icon: '👻', color: 'from-yellow-400 to-amber-500' },
  { name: 'Twitch', icon: '🎮', color: 'from-purple-600 to-indigo-700' },
  { name: 'Threads', icon: '🧵', color: 'from-zinc-700 to-zinc-900' },
  { name: 'Discord', icon: '💬', color: 'from-indigo-500 to-blue-700' },
  { name: 'Pinterest', icon: '📌', color: 'from-red-600 to-rose-700' },
];

const COLOR_PRESETS = [
  { label: 'sky', value: 'from-sky-500 to-blue-600', preview: 'bg-gradient-to-r from-sky-500 to-blue-600' },
  { label: 'orange', value: 'from-orange-500 to-rose-600', preview: 'bg-gradient-to-r from-orange-500 to-rose-600' },
  { label: 'emerald', value: 'from-emerald-500 to-teal-600', preview: 'bg-gradient-to-r from-emerald-500 to-teal-600' },
  { label: 'purple', value: 'from-purple-600 to-indigo-700', preview: 'bg-gradient-to-r from-purple-600 to-indigo-700' },
  { label: 'pink', value: 'from-pink-500 to-rose-600', preview: 'bg-gradient-to-r from-pink-500 to-rose-600' },
  { label: 'gold', value: 'from-yellow-400 to-amber-500', preview: 'bg-gradient-to-r from-yellow-400 to-amber-500' },
  { label: 'graphite', value: 'from-zinc-700 to-zinc-900', preview: 'bg-gradient-to-r from-zinc-700 to-zinc-900' },
  { label: 'red', value: 'from-red-600 to-rose-700', preview: 'bg-gradient-to-r from-red-600 to-rose-700' },
];

export function CustomPlatformModal({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  editData,
}: CustomPlatformModalProps) {
  const { t } = useTranslation();
  const isEditMode = Boolean(editData);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('⭐');
  const [color, setColor] = useState('from-purple-500 to-indigo-600');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Populate form when in edit mode or when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setName(editData.name);
        setIcon(editData.icon || '⭐');
        setColor(editData.color || 'from-purple-500 to-indigo-600');
      } else {
        setName('');
        setIcon('⭐');
        setColor('from-purple-500 to-indigo-600');
      }
      setError('');
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const handleSelectPreset = (p: typeof PRESET_SUGGESTIONS[0]) => {
    setName(p.name);
    setIcon(p.icon);
    setColor(p.color);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('platformModal.required'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let res: Response;
      if (isEditMode && editData) {
        res = await fetch(`/api/platforms/${editData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            icon: icon.trim() || '⭐',
            color: color.trim(),
          }),
        });
      } else {
        res = await fetch('/api/platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            icon: icon.trim() || '⭐',
            color: color.trim(),
          }),
        });
      }

      const data = await res.json();
      if (data.success) {
        if (isEditMode) {
          onUpdated?.(data.data);
        } else {
          onCreated(data.data);
        }
        onClose();
      } else {
        setError(data.error || t('platformModal.failed'));
      }
    } catch {
      setError(t('errors.connection'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0e1422] border border-[#1f293d] rounded-3xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f293d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-base shadow-md shadow-purple-500/20">
              {isEditMode ? <Pencil className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditMode ? t('platformModal.edit') : t('platformModal.add')}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditMode ? t('platformModal.editDescription') : t('platformModal.addDescription')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips (only in create mode) */}
        {!isEditMode && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('platformModal.quickSuggestions')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SUGGESTIONS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => handleSelectPreset(preset)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#151c2e] hover:bg-slate-800 text-slate-300 border border-[#1f293d] hover:border-slate-700 transition"
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('platformModal.name')} <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('platformModal.namePlaceholder')}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151c2e] border border-[#1f293d] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Emoji / Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('platformModal.icon')}
            </label>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-10 h-10 rounded-xl bg-[#151c2e] border border-[#1f293d] flex items-center justify-center text-xl shrink-0">
                {icon}
              </span>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-24 px-3 py-2 rounded-xl bg-[#151c2e] border border-[#1f293d] text-center text-sm text-white focus:outline-none focus:border-pink-500"
              />
              <span className="text-xs text-slate-500">{t('platformModal.iconHint')}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#111827] border border-[#1f293d]">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition ${
                    icon === e ? 'bg-pink-500/20 ring-1 ring-pink-500' : 'hover:bg-slate-800'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('platformModal.color')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`h-9 rounded-xl flex items-center justify-center transition ${c.preview} ${
                    color === c.value ? 'ring-2 ring-white scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={t(`platformModal.colors.${c.label}`)}
                >
                  {color === c.value && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview button */}
          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              {t('platformModal.preview')}
            </label>
            <div
              className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md bg-gradient-to-r ${color}`}
            >
              <span>{icon}</span>
              <span>{t('platformModal.open', { name: name || 'Platform' })}</span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1f293d]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-purple-500/25 transition disabled:opacity-50"
            >
              {isEditMode ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isSubmitting ? (isEditMode ? t('common.saving') : t('platformModal.adding')) : (isEditMode ? t('common.save') : t('platformModal.save'))}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
