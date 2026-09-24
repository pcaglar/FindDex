'use client';

import React, { useEffect, useState } from 'react';
import { Download, FileArchive, FileJson, Upload, X } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { useTranslation } from 'react-i18next';

interface DataTransferModalProps {
  isOpen: boolean;
  initialTab: 'export' | 'import';
  onClose: () => void;
  onImported: () => void;
}

export function DataTransferModal({ isOpen, initialTab, onClose, onImported }: DataTransferModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'export' | 'import'>(initialTab);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setFile(null);
      setMode('merge');
      setError('');
      setMessage('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const runImport = async () => {
    if (!file) {
      setError(t('transfer.chooseError'));
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mode', mode);
      const response = await fetch('/api/import', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || t('transfer.importFailed'));
      setMessage(t('transfer.imported', { profiles: result.data.profiles, uploads: result.data.uploads }));
      onImported();
    } catch (importError: any) {
      setError(importError?.message || t('transfer.importFailed'));
    } finally {
      setBusy(false);
    }
  };

  const requestImport = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError(t('transfer.chooseError'));
      return;
    }
    if (mode === 'replace') setShowReplaceConfirm(true);
    else void runImport();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0e1422] border border-slate-200 dark:border-[#1f293d] shadow-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('transfer.title')}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('transfer.description')}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t('common.close')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 mb-5">
            {(['export', 'import'] as const).map((value) => (
              <button key={value} onClick={() => setTab(value)} className={`py-2 rounded-lg text-xs font-bold transition ${tab === value ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                {value === 'export' ? t('settings.export') : t('settings.import')}
              </button>
            ))}
          </div>

          {tab === 'export' ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <a href="/api/export?format=json" download className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-pink-400 bg-slate-50 dark:bg-slate-900 transition group">
                <FileJson className="w-7 h-7 text-pink-500 mb-3" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('transfer.downloadJson')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('transfer.jsonDescription')}</p>
              </a>
              <a href="/api/export?format=zip" download className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-cyan-400 bg-slate-50 dark:bg-slate-900 transition group">
                <FileArchive className="w-7 h-7 text-cyan-500 mb-3" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('transfer.downloadZip')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('transfer.zipDescription')}</p>
              </a>
            </div>
          ) : (
            <form onSubmit={requestImport} className="space-y-4">
              <label className="block p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:border-pink-400 transition">
                <input type="file" accept=".json,.zip,application/json,application/zip" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                <div className="flex items-center gap-3">
                  <Upload className="w-6 h-6 text-pink-500" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{file?.name || t('transfer.choose')}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t('transfer.finddexFile')}</div>
                  </div>
                </div>
              </label>

              <div className="space-y-2">
                <label className="flex gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} className="accent-pink-500" />
                  <span><strong className="block text-xs text-slate-900 dark:text-white">{t('transfer.merge')}</strong><span className="text-xs text-slate-500">{t('transfer.mergeDescription')}</span></span>
                </label>
                <label className="flex gap-3 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 cursor-pointer">
                  <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="accent-rose-500" />
                  <span><strong className="block text-xs text-rose-600 dark:text-rose-400">{t('transfer.replace')}</strong><span className="text-xs text-slate-500">{t('transfer.replaceDescription')}</span></span>
                </label>
              </div>

              {error && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl">{error}</p>}
              {message && <p className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl">{message}</p>}

              <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold disabled:opacity-50">
                <Download className="w-4 h-4 rotate-180" />
                {busy ? t('transfer.importing') : t('settings.import')}
              </button>
            </form>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showReplaceConfirm}
        title={t('transfer.replaceTitle')}
        message={t('transfer.replaceMessage')}
        confirmLabel={t('transfer.replaceConfirm')}
        isDangerous
        onCancel={() => setShowReplaceConfirm(false)}
        onConfirm={() => { setShowReplaceConfirm(false); void runImport(); }}
      />
    </>
  );
}
