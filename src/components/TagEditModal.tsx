'use client';

import React, { useState, useEffect } from 'react';
import { X, Tag, Pencil } from 'lucide-react';
import { getTagStyle, TAG_COLOR_OPTIONS } from '@/lib/colors';
import { useTranslation } from 'react-i18next';

interface TagEditModalProps {
  isOpen: boolean;
  tagId: string;
  tagName: string;
  tagColor?: string;
  onClose: () => void;
  onUpdated: (id: string, newName: string, color: string) => void;
}

export function TagEditModal({ isOpen, tagId, tagName, tagColor = 'pink', onClose, onUpdated }: TagEditModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState('pink');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(tagName);
      setColor(tagColor || 'pink');
      setError('');
    }
  }, [isOpen, tagName, tagColor]);

  if (!isOpen) return null;

  const style = getTagStyle(tagName, color);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('edit.required'));
      return;
    }
    if (trimmed === tagName && color === tagColor) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, color }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated(tagId, trimmed, color);
        onClose();
      } else {
        setError(data.error || t('edit.renameFailed'));
      }
    } catch {
      setError(t('errors.connection'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0e1422] border border-[#1f293d] rounded-2xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${style.bg}`}>
              <Tag className={`w-3.5 h-3.5 ${style.text}`} />
            </div>
            <h3 className="text-sm font-bold text-white">{t('edit.renameTag')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">{t('edit.newTagName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full px-3 py-2.5 rounded-xl bg-[#151c2e] border border-[#1f293d] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">{t('edit.tagColor')}</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TAG_COLOR_OPTIONS).map(([value, option]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setColor(value)}
                  className={`w-7 h-7 rounded-full ${option.dot} transition ${color === value ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0e1422] ring-pink-400 scale-110' : 'opacity-70 hover:opacity-100'}`}
                  aria-label={t('edit.selectColor', { color: value })}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t('common.saving') : t('common.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
