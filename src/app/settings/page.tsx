'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Database, Download, FileArchive, Grid2X2, HardDrive, Image, List, Monitor, Moon, PanelLeft, RefreshCcw, RefreshCw, Search, Settings, Sun, Trash2, Upload, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SortOption } from '@/types/profile';
import { applyThemePreference, getStoredThemePreference, watchTheme, type ThemePreference } from '@/lib/theme';
import { DEFAULT_PAGE_SIZE_KEY, DEFAULT_SORT_KEY, DEFAULT_VIEW_KEY, PAGE_SIZE_OPTIONS, readPreference, resetSidebarPreferences, SORT_OPTIONS } from '@/lib/preferences';
import { DataTransferModal } from '@/components/DataTransferModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { TypedConfirmModal } from '@/components/TypedConfirmModal';
import { ApiAccessSection } from '@/components/ApiAccessSection';
import { useTranslation } from 'react-i18next';
import { currentLanguage, formatDateTime, formatNumber } from '@/i18n/format';
import type { AppLanguage } from '@/i18n/config';

const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-pink-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
type ServerSettings = { automaticBackupEnabled: boolean; backupRetention: number; trashRetentionDays: number };
type BackupFile = { name: string; size: number; createdAt: string };
export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const language = currentLanguage(i18n.language);
  const formatBytes = (bytes: number) => {
    const value = bytes < 1024 * 1024 ? bytes / 1024 : bytes < 1024 ** 3 ? bytes / 1024 ** 2 : bytes / 1024 ** 3;
    const unit = bytes < 1024 * 1024 ? 'KB' : bytes < 1024 ** 3 ? 'MB' : 'GB';
    return `${formatNumber(value, language, { maximumFractionDigits: unit === 'GB' ? 2 : 1 })} ${unit}`;
  };
  const [theme, setTheme] = useState<ThemePreference>('dark');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pageSize, setPageSize] = useState(16);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [sidebarReset, setSidebarReset] = useState(false);
  const [transferModal, setTransferModal] = useState<'export' | 'import' | null>(null);
  const [serverSettings, setServerSettings] = useState<ServerSettings>({ automaticBackupEnabled: false, backupRetention: 7, trashRetentionDays: 30 });
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [storage, setStorage] = useState({ profiles: 0, activeProfiles: 0, trashProfiles: 0, images: 0, tags: 0, collections: 0, uploadFiles: 0, uploadsBytes: 0, databaseBytes: 0 });
  const [backupBusy, setBackupBusy] = useState(false);
  const [unused, setUnused] = useState<{ tags: { id: string; name: string }[]; collections: { id: string; name: string }[] } | null>(null);
  const [selectedUnused, setSelectedUnused] = useState<string[]>([]);
  const [orphans, setOrphans] = useState<{ name: string; size: number }[] | null>(null);
  const [selectedOrphans, setSelectedOrphans] = useState<string[]>([]);
  const [maintenanceBusy, setMaintenanceBusy] = useState<'unused' | 'orphans' | null>(null);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState<'unused' | 'orphans' | null>(null);
  const [technical, setTechnical] = useState<{ version: string; nodeVersion: string; latestMigration: { name: string; date: string | null } | null } | null>(null);
  const [dangerConfirm, setDangerConfirm] = useState<'trash' | 'reset' | 'demo' | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerMessage, setDangerMessage] = useState('');

  useEffect(() => {
    setTheme(getStoredThemePreference());
    setViewMode(readPreference(DEFAULT_VIEW_KEY) === 'list' ? 'list' : 'grid');
    const storedSize = Number(readPreference(DEFAULT_PAGE_SIZE_KEY));
    if (PAGE_SIZE_OPTIONS.includes(storedSize as (typeof PAGE_SIZE_OPTIONS)[number])) setPageSize(storedSize);
    const storedSort = readPreference(DEFAULT_SORT_KEY) as SortOption;
    if (SORT_OPTIONS.some((option) => option.value === storedSort)) setSortBy(storedSort);
    return watchTheme((_resolved, preference) => setTheme(preference));
  }, []);

  const loadDataManagement = async () => {
    const [settingsResponse, backupsResponse, storageResponse] = await Promise.all([
      fetch('/api/settings', { cache: 'no-store' }), fetch('/api/settings/backups', { cache: 'no-store' }), fetch('/api/settings/storage', { cache: 'no-store' }),
    ]);
    const [settingsResult, backupsResult, storageResult] = await Promise.all([settingsResponse.json(), backupsResponse.json(), storageResponse.json()]);
    if (settingsResult.success) setServerSettings(settingsResult.data);
    if (backupsResult.success) setBackups(backupsResult.data.files);
    if (storageResult.success) setStorage(storageResult.data);
  };

  useEffect(() => { void loadDataManagement(); }, []);
  useEffect(() => { fetch('/api/settings/technical').then((response) => response.json()).then((result) => { if (result.success) setTechnical(result.data); }); }, []);

  const saveServerSettings = async (patch: Partial<ServerSettings>) => {
    const next = { ...serverSettings, ...patch };
    setServerSettings(next);
    const response = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    const result = await response.json();
    if (result.success) setServerSettings(result.data);
  };

  const createBackupNow = async () => {
    setBackupBusy(true);
    try { await fetch('/api/settings/backups', { method: 'POST' }); await loadDataManagement(); }
    finally { setBackupBusy(false); }
  };

  const scanUnused = async () => {
    setMaintenanceBusy('unused');
    try { const result = await (await fetch('/api/maintenance/unused', { cache: 'no-store' })).json(); if (result.success) { setUnused(result.data); setSelectedUnused([...result.data.tags, ...result.data.collections].map((item: { id: string }) => item.id)); } }
    finally { setMaintenanceBusy(null); }
  };
  const scanOrphans = async () => {
    setMaintenanceBusy('orphans');
    try { const result = await (await fetch('/api/maintenance/orphans', { cache: 'no-store' })).json(); if (result.success) { setOrphans(result.data); setSelectedOrphans(result.data.map((item: { name: string }) => item.name)); } }
    finally { setMaintenanceBusy(null); }
  };
  const deleteMaintenanceItems = async () => {
    if (maintenanceConfirm === 'unused' && unused) {
      await fetch('/api/maintenance/unused', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagIds: unused.tags.filter((item) => selectedUnused.includes(item.id)).map((item) => item.id), collectionIds: unused.collections.filter((item) => selectedUnused.includes(item.id)).map((item) => item.id) }) });
      await scanUnused();
    } else if (maintenanceConfirm === 'orphans') {
      await fetch('/api/maintenance/orphans', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filenames: selectedOrphans }) });
      await scanOrphans(); await loadDataManagement();
    }
    setMaintenanceConfirm(null);
  };
  const emptyAllTrash = async () => {
    setDangerBusy(true);
    try {
      const result = await (await fetch('/api/trash', { method: 'DELETE' })).json();
      setDangerMessage(result.success ? t('settings.deletedProfiles', { count: result.count }) : result.error);
      setDangerConfirm(null); await loadDataManagement();
    } finally { setDangerBusy(false); }
  };
  const resetAllData = async () => {
    setDangerBusy(true);
    try {
      const result = await (await fetch('/api/settings/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: language === 'tr' ? 'SIFIRLA' : 'RESET' }) })).json();
      setDangerMessage(result.success ? t('settings.allDataDeleted') : result.error);
      setDangerConfirm(null); await loadDataManagement();
    } finally { setDangerBusy(false); }
  };
  const loadDemoData = async () => {
    setDangerBusy(true);
    try {
      const result = await (await fetch('/api/settings/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'DEMO' }) })).json();
      if (result.success) {
        setDangerMessage(result.message);
        setDangerConfirm(null);
        await loadDataManagement();
        window.setTimeout(() => window.location.assign('/'), 1200);
      } else setDangerMessage(result.error);
    } finally { setDangerBusy(false); }
  };

  const chooseTheme = (preference: ThemePreference) => {
    setTheme(preference);
    applyThemePreference(preference);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-[#0a0e17] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-2.5"><Settings className="h-5 w-5 text-pink-500" /></div>
            <div><h1 className="text-2xl font-bold">{t('settings.title')}</h1><p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p></div>
          </div>
          <Link href="/" className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:border-pink-400 dark:border-slate-700 dark:bg-slate-900"><ArrowLeft className="h-4 w-4" /> {t('nav.home')}</Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:p-6">
          <h2 className="mb-1 text-lg font-bold">{t('settings.appearance')}</h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t('settings.appearanceDescription')}</p>
          <div className="space-y-7">
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('settings.theme')}</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {([['dark', t('settings.dark'), Moon], ['light', t('settings.light'), Sun], ['system', t('settings.system'), Monitor]] as const).map(([value, label, Icon]) => (
                  <button key={value} onClick={() => chooseTheme(value)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${theme === value ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-300' : 'border-slate-200 hover:border-slate-400 dark:border-slate-700'}`}>
                    <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span>{theme === value && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
            <label className="block max-w-sm space-y-2 border-t border-slate-200 pt-6 dark:border-slate-800">
              <span className="text-sm font-semibold">{t('language.label')}</span>
              <select className={fieldClass} value={language} onChange={(event) => void i18n.changeLanguage(event.target.value as AppLanguage)}>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
              <small className="block text-slate-500">{t('language.description')}</small>
            </label>
            <div className="grid gap-5 border-t border-slate-200 pt-6 dark:border-slate-800 md:grid-cols-3">
              <div className="space-y-2"><span className="text-sm font-semibold">{t('settings.defaultView')}</span><div className="grid grid-cols-2 gap-2">{(['grid', 'list'] as const).map((mode) => <button type="button" key={mode} onClick={() => { setViewMode(mode); localStorage.setItem(DEFAULT_VIEW_KEY, mode); }} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${viewMode === mode ? 'border-pink-500 bg-pink-500/10' : 'border-slate-300 dark:border-slate-700'}`}>{mode === 'grid' ? <Grid2X2 className="h-4 w-4" /> : <List className="h-4 w-4" />}{t(`settings.${mode}`)}</button>)}</div></div>
              <label className="space-y-2"><span className="text-sm font-semibold">{t('settings.perPage')}</span><select className={fieldClass} value={pageSize} onChange={(event) => { const value = Number(event.target.value); setPageSize(value); localStorage.setItem(DEFAULT_PAGE_SIZE_KEY, String(value)); }}>{PAGE_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{t('settings.cards', { count: value })}</option>)}</select></label>
              <label className="space-y-2"><span className="text-sm font-semibold">{t('settings.defaultSort')}</span><select className={fieldClass} value={sortBy} onChange={(event) => { const value = event.target.value as SortOption; setSortBy(value); localStorage.setItem(DEFAULT_SORT_KEY, value); }}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(`filters.${option.value === 'name-asc' ? 'nameAZ' : option.value === 'name-desc' ? 'nameZA' : option.value === 'favorites' ? 'favoritesFirst' : option.value}`)}</option>)}</select></label>
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:items-center">
              <div><h3 className="text-sm font-semibold">{t('settings.sidebar')}</h3><p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.sidebarDescription')}</p></div>
              <button onClick={() => { resetSidebarPreferences(); setSidebarReset(true); window.setTimeout(() => setSidebarReset(false), 1800); }} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:border-pink-500 dark:border-slate-700"><PanelLeft className="h-4 w-4" />{sidebarReset ? t('settings.sidebarReset') : t('settings.resetSidebar')}</button>
            </div>
          </div>
        </section>

        <ApiAccessSection />

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:p-6">
          <h2 className="mb-1 text-lg font-bold">{t('settings.dataManagement')}</h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t('settings.dataDescription')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => setTransferModal('export')} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-pink-400 dark:border-slate-700"><Download className="h-5 w-5 text-pink-500" /><span><strong className="block text-sm">{t('settings.export')}</strong><small className="text-slate-500">{t('settings.exportDescription')}</small></span></button>
            <button onClick={() => setTransferModal('import')} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-cyan-400 dark:border-slate-700"><Upload className="h-5 w-5 text-cyan-500" /><span><strong className="block text-sm">{t('settings.import')}</strong><small className="text-slate-500">{t('settings.importDescription')}</small></span></button>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div><h3 className="text-sm font-semibold">{t('settings.autoBackup')}</h3><p className="mt-1 text-xs text-slate-500">{t('settings.autoBackupDescription')}</p></div>
              <button role="switch" aria-checked={serverSettings.automaticBackupEnabled} onClick={() => void saveServerSettings({ automaticBackupEnabled: !serverSettings.automaticBackupEnabled })} className={`relative h-7 w-12 rounded-full transition ${serverSettings.automaticBackupEnabled ? 'bg-pink-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${serverSettings.automaticBackupEnabled ? 'left-6' : 'left-1'}`} /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="space-y-2"><span className="text-xs font-semibold">{t('settings.backupRetention')}</span><select className={fieldClass} value={serverSettings.backupRetention} onChange={(event) => void saveServerSettings({ backupRetention: Number(event.target.value) })}>{[3, 7, 14, 30].map((value) => <option key={value}>{value}</option>)}</select></label>
              <button disabled={backupBusy} onClick={() => void createBackupNow()} className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${backupBusy ? 'animate-spin' : ''}`} />{t('settings.backupNow')}</button>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><FileArchive className="h-4 w-4 text-amber-500" />{backups[0] ? t('settings.existingBackups', { date: formatDateTime(backups[0].createdAt, language) }) : t('settings.noBackups')}</div>
              {backups.length ? <div className="space-y-1">{backups.map((file) => <a key={file.name} href={`/api/settings/backups/${encodeURIComponent(file.name)}`} download className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-200 dark:hover:bg-slate-800"><span className="truncate">{file.name}</span><span className="ml-3 text-slate-500">{formatBytes(file.size)}</span></a>)}</div> : null}
            </div>
          </div>

          <div className="mt-6 grid gap-5 border-t border-slate-200 pt-6 dark:border-slate-800 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-semibold">{t('settings.trashRetention')}</span><select className={fieldClass} value={serverSettings.trashRetentionDays} onChange={(event) => void saveServerSettings({ trashRetentionDays: Number(event.target.value) })}>{[7, 15, 30, 60].map((value) => <option key={value} value={value}>{t('settings.days', { count: value })}</option>)}</select><small className="block text-slate-500">{t('settings.trashRetentionHint')}</small></label>
            <div><h3 className="mb-2 text-sm font-semibold">{t('settings.storage')}</h3><div className="grid grid-cols-2 gap-2 text-xs">{[[Database, t('settings.profiles'), formatNumber(storage.profiles, language)], [Image, t('settings.images'), formatNumber(storage.images, language)], [HardDrive, t('settings.uploads'), formatBytes(storage.uploadsBytes)], [Database, t('settings.database'), formatBytes(storage.databaseBytes)]].map(([Icon, label, value]) => { const StorageIcon = Icon as typeof Database; return <div key={String(label)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><StorageIcon className="mb-2 h-4 w-4 text-pink-500" /><span className="block text-slate-500">{String(label)}</span><strong>{String(value)}</strong></div>; })}</div></div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:p-6">
          <h2 className="mb-1 text-lg font-bold">{t('settings.maintenance')}</h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t('settings.maintenanceDescription')}</p>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{t('settings.unused')}</h3><p className="text-xs text-slate-500">{t('settings.unusedDescription')}</p></div><button onClick={() => void scanUnused()} disabled={maintenanceBusy === 'unused'} className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold dark:bg-slate-800"><Search className={`h-4 w-4 ${maintenanceBusy === 'unused' ? 'animate-spin' : ''}`} />{t('common.scan')}</button></div>
              {unused && <div className="space-y-2">{[...unused.tags.map((item) => ({ ...item, type: t('settings.tag') })), ...unused.collections.map((item) => ({ ...item, type: t('settings.collection') }))].map((item) => <label key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900"><span><span className="mr-2 text-slate-500">{item.type}</span>{item.name}</span><input type="checkbox" className="accent-pink-500" checked={selectedUnused.includes(item.id)} onChange={() => setSelectedUnused((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /></label>)}{unused.tags.length + unused.collections.length === 0 && <p className="text-xs text-emerald-600">{t('settings.noneUnused')}</p>}{selectedUnused.length > 0 && <button onClick={() => setMaintenanceConfirm('unused')} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-2 text-xs font-bold text-white"><Trash2 className="h-4 w-4" />{t('settings.deleteSelected', { count: selectedUnused.length })}</button>}</div>}
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{t('settings.orphanFiles')}</h3><p className="text-xs text-slate-500">{t('settings.orphanDescription')}</p></div><button onClick={() => void scanOrphans()} disabled={maintenanceBusy === 'orphans'} className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold dark:bg-slate-800"><HardDrive className={`h-4 w-4 ${maintenanceBusy === 'orphans' ? 'animate-pulse' : ''}`} />{t('settings.cleanDisk')}</button></div>
              {orphans && <div className="space-y-2">{orphans.map((item) => <label key={item.name} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900"><span className="min-w-0 truncate">{item.name} <small className="text-slate-500">({formatBytes(item.size)})</small></span><input type="checkbox" className="accent-pink-500" checked={selectedOrphans.includes(item.name)} onChange={() => setSelectedOrphans((current) => current.includes(item.name) ? current.filter((name) => name !== item.name) : [...current, item.name])} /></label>)}{orphans.length === 0 && <p className="text-xs text-emerald-600">{t('settings.noneOrphaned')}</p>}{selectedOrphans.length > 0 && <button onClick={() => setMaintenanceConfirm('orphans')} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-2 text-xs font-bold text-white"><Trash2 className="h-4 w-4" />{t('settings.deleteSelectedFiles', { count: selectedOrphans.length })}</button>}</div>}
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/70"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Wrench className="h-4 w-4 text-cyan-500" />{t('settings.technical')}</div><div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3"><span>FindDex <strong className="text-slate-800 dark:text-slate-200">v{technical?.version || '—'}</strong></span><span>Node.js <strong className="text-slate-800 dark:text-slate-200">{technical?.nodeVersion || '—'}</strong></span><span className="truncate" title={technical?.latestMigration?.name}>{t('settings.migration')} <strong className="text-slate-800 dark:text-slate-200">{technical?.latestMigration?.name || '—'}</strong></span></div></div>
        </section>

        <section className="mt-6 rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-5 shadow-sm dark:border-rose-900/70 dark:bg-rose-950/10 sm:p-6">
          <h2 className="mb-1 text-lg font-bold text-rose-700 dark:text-rose-400">{t('settings.danger')}</h2>
          <p className="mb-5 text-sm text-rose-700/70 dark:text-rose-300/70">{t('settings.dangerDescription')}</p>
          {dangerMessage && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900">{dangerMessage}</div>}
          <div className="space-y-3">
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-white p-4 dark:border-rose-900/60 dark:bg-[#111827] sm:flex-row sm:items-center"><div><h3 className="text-sm font-bold">{t('settings.emptyTrash')}</h3><p className="text-xs text-slate-500">{t('settings.emptyTrashDescription', { count: storage.trashProfiles })}</p></div><button disabled={storage.trashProfiles === 0} onClick={() => setDangerConfirm('trash')} className="shrink-0 rounded-xl border border-rose-400 px-4 py-2.5 text-xs font-bold text-rose-600 disabled:opacity-40 dark:text-rose-400">{t('settings.emptyTrashButton')}</button></div>
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-rose-300 bg-white p-4 dark:border-rose-800 dark:bg-[#111827] sm:flex-row sm:items-center"><div><h3 className="text-sm font-bold">{t('settings.resetAll')}</h3><p className="text-xs text-slate-500">{t('settings.resetAllDescription', { profiles: storage.profiles, tags: storage.tags, collections: storage.collections })}</p></div><button onClick={() => setDangerConfirm('reset')} className="shrink-0 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white">{t('settings.resetAll')}</button></div>
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-300 bg-white p-4 dark:border-amber-800/70 dark:bg-[#111827] sm:flex-row sm:items-center"><div><h3 className="flex items-center gap-2 text-sm font-bold"><RefreshCcw className="h-4 w-4 text-amber-500" />{t('settings.loadDemo')}</h3><p className="text-xs text-slate-500">{t('settings.loadDemoDescription')}</p></div><button onClick={() => setDangerConfirm('demo')} className="shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400">{t('settings.loadDemo')}</button></div>
          </div>
        </section>
      </div>
      <DataTransferModal isOpen={Boolean(transferModal)} initialTab={transferModal || 'export'} onClose={() => setTransferModal(null)} onImported={() => void loadDataManagement()} />
      <ConfirmModal isOpen={Boolean(maintenanceConfirm)} title={maintenanceConfirm === 'orphans' ? t('settings.deleteOrphansTitle') : t('settings.deleteUnusedTitle')} message={maintenanceConfirm === 'orphans' ? t('settings.deleteFilesMessage', { count: selectedOrphans.length }) : t('settings.deleteItemsMessage', { count: selectedUnused.length })} confirmLabel={t('settings.deletePermanently')} isDangerous onCancel={() => setMaintenanceConfirm(null)} onConfirm={() => void deleteMaintenanceItems()} />
      <ConfirmModal isOpen={dangerConfirm === 'trash'} title={t('settings.emptyTrash')} message={t('settings.emptyTrashMessage', { count: storage.trashProfiles })} confirmLabel={t('settings.emptyTrashConfirm')} isDangerous onCancel={() => setDangerConfirm(null)} onConfirm={() => void emptyAllTrash()} />
      <TypedConfirmModal isOpen={dangerConfirm === 'reset'} title={t('settings.resetAll')} message={t('settings.resetMessage', { profiles: storage.profiles, tags: storage.tags, collections: storage.collections })} confirmationText={language === 'tr' ? 'SIFIRLA' : 'RESET'} busy={dangerBusy} onCancel={() => setDangerConfirm(null)} onConfirm={() => void resetAllData()} />
      <TypedConfirmModal isOpen={dangerConfirm === 'demo'} title={t('settings.loadDemo')} message={t('settings.demoMessage')} confirmationText="DEMO" busy={dangerBusy} onCancel={() => setDangerConfirm(null)} onConfirm={() => void loadDemoData()} />
    </main>
  );
}
