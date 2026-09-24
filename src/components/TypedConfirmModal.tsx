'use client';

import { AlertOctagon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function TypedConfirmModal({ isOpen, title, message, confirmationText, onConfirm, onCancel, busy = false }: { isOpen: boolean; title: string; message: string; confirmationText: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  useEffect(() => { if (isOpen) setValue(''); }, [isOpen]);
  if (!isOpen) return null;
  const enabled = value === confirmationText && !busy;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="relative w-full max-w-md rounded-3xl border border-rose-500/40 bg-white p-6 shadow-2xl dark:bg-[#0e1422]"><button onClick={onCancel} className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button><div className="mb-4 flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500"><AlertOctagon className="h-5 w-5" /></div><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{message}</p></div></div><label className="block text-xs font-semibold">{t('settings.typeToContinue', { text: confirmationText })}<input autoFocus value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 w-full rounded-xl border border-rose-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-500 dark:border-rose-900 dark:bg-slate-900" /></label><div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800"><button onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-semibold">{t('common.cancel')}</button><button disabled={!enabled} onClick={onConfirm} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">{busy ? t('settings.resetting') : title}</button></div></div></div>;
}
