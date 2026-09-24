'use client';

import { Check, Clipboard, Eye, EyeOff, KeyRound, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/ConfirmModal';
import { currentLanguage, formatDateTime } from '@/i18n/format';

type ApiKeyItem = { id: string; key: string; label: string; createdAt: string; lastUsedAt: string | null };
const maskKey = (key: string) => `${key.slice(0, 8)}••••••••${key.slice(-4)}`;

export function ApiAccessSection() {
  const { t, i18n } = useTranslation();
  const language = currentLanguage(i18n.language);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [label, setLabel] = useState('Chrome Extension');
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState('');
  const [visible, setVisible] = useState<string[]>([]);
  const [revoke, setRevoke] = useState<ApiKeyItem | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => { const result = await (await fetch('/api/settings/api-keys', { cache: 'no-store' })).json(); if (result.success) setKeys(result.data); };
  useEffect(() => { void load(); }, []);
  const create = async () => {
    const result = await (await fetch('/api/settings/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) })).json();
    if (result.success) { setCreatedKey(result.data.key); setShowCreate(false); await load(); }
  };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  const revokeKey = async () => { if (!revoke) return; await fetch(`/api/settings/api-keys/${revoke.id}`, { method: 'DELETE' }); setRevoke(null); await load(); };

  return <>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-cyan-500" />{t('apiAccess.title')}</h2><p className="mt-1 text-sm text-slate-500">{t('apiAccess.description')}</p></div><button onClick={() => { setLabel(t('apiAccess.defaultLabel')); setShowCreate(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />{t('apiAccess.newKey')}</button></div>
      {createdKey && <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-amber-800 dark:text-amber-300">{t('apiAccess.ready')}</strong><p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t('apiAccess.copyHint')}</p></div><button onClick={() => setCreatedKey('')}><X className="h-4 w-4" /></button></div><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs dark:bg-slate-900">{createdKey}</code><button onClick={() => void copy(createdKey)} className="rounded-lg bg-amber-500 px-3 text-slate-950">{copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button></div></div>}
      {showCreate && <div className="mb-4 flex flex-col gap-2 rounded-xl border border-cyan-300 p-3 sm:flex-row"><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t('apiAccess.keyName')} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" /><button disabled={!label.trim()} onClick={() => void create()} className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{t('common.create')}</button><button onClick={() => setShowCreate(false)} className="rounded-lg px-3 py-2 text-xs">{t('common.cancel')}</button></div>}
      <div className="space-y-2">{keys.map((item) => { const isVisible = visible.includes(item.id); return <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{item.label}</div><code className="block truncate text-xs text-slate-500">{isVisible ? item.key : maskKey(item.key)}</code><div className="mt-1 text-[11px] text-slate-500">{t('apiAccess.created', { date: formatDateTime(item.createdAt, language), lastUsed: item.lastUsedAt ? formatDateTime(item.lastUsedAt, language) : t('apiAccess.neverUsed') })}</div></div><div className="flex gap-2"><button onClick={() => setVisible((current) => isVisible ? current.filter((id) => id !== item.id) : [...current, item.id])} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700">{isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{isVisible ? t('common.hide') : t('common.show')}</button><button onClick={() => setRevoke(item)} className="flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-xs text-rose-600"><Trash2 className="h-3.5 w-3.5" />{t('apiAccess.revoke')}</button></div></div>; })}{keys.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">{t('apiAccess.empty')}</p>}</div>
    </section>
    <ConfirmModal isOpen={Boolean(revoke)} title={t('apiAccess.revokeTitle')} message={t('apiAccess.revokeMessage', { name: `“${revoke?.label || ''}”` })} confirmLabel={t('apiAccess.revoke')} isDangerous onCancel={() => setRevoke(null)} onConfirm={() => void revokeKey()} />
  </>;
}
