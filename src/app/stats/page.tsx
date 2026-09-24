'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, FolderHeart, Heart, Trash2, Users, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { currentLanguage, formatNumber } from '@/i18n/format';

interface StatsData {
  summary: { total: number; favorites: number; collections: number; trash: number };
  platformDistribution: { name: string; value: number }[];
  topTags: { name: string; value: number }[];
  trend: { date: string; value: number }[];
  verified: { count: number; total: number; percentage: number };
}

function Bars({ data, color = 'bg-pink-500' }: { data: { name: string; value: number }[]; color?: string }) {
  const { t, i18n } = useTranslation();
  const max = Math.max(1, ...data.map((item) => item.value));
  return <div className="space-y-3">{data.length ? data.map((item) => (
    <div key={item.name} className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-xs">
      <span className="truncate text-slate-300" title={item.name}>{item.name}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(4, item.value / max * 100)}%` }} />
      </div>
      <span className="text-right font-bold text-slate-400">{formatNumber(item.value, currentLanguage(i18n.language))}</span>
    </div>
  )) : <p className="text-sm text-slate-500">{t('stats.noData')}</p>}</div>;
}

function TrendChart({ data }: { data: { date: string; value: number }[] }) {
  const { t } = useTranslation();
  const points = useMemo(() => {
    const max = Math.max(1, ...data.map((item) => item.value));
    return data.map((item, index) => `${(index / Math.max(1, data.length - 1)) * 100},${92 - (item.value / max) * 78}`).join(' ');
  }, [data]);
  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-52 w-full overflow-visible" role="img" aria-label={t('stats.trend')}>
        <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ec4899" stopOpacity=".35"/><stop offset="1" stopColor="#ec4899" stopOpacity="0"/></linearGradient></defs>
        {[20, 40, 60, 80].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" className="text-slate-700" strokeWidth=".35" />)}
        {points && <polygon points={`0,100 ${points} 100,100`} fill="url(#trendFill)" />}
        <polyline points={points} fill="none" stroke="#ec4899" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500"><span>{t('stats.thirtyDaysAgo')}</span><span>{t('stats.today')}</span></div>
    </div>
  );
}

export default function StatsPage() {
  const { t, i18n } = useTranslation();
  const language = currentLanguage(i18n.language);
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/stats/detailed').then((response) => response.json()).then((result) => {
      if (!result.success) throw new Error(result.error);
      setData(result.data);
    }).catch((reason) => setError(reason.message || t('stats.loadError')));
  }, [t]);

  const cards = data ? [
    { label: t('stats.totalProfiles'), value: data.summary.total, icon: Users, color: 'text-sky-400' },
    { label: t('stats.favorites'), value: data.summary.favorites, icon: Heart, color: 'text-rose-400' },
    { label: t('stats.collections'), value: data.summary.collections, icon: FolderHeart, color: 'text-purple-400' },
    { label: t('stats.trash'), value: data.summary.trash, icon: Trash2, color: 'text-amber-400' },
  ] : [];

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-pink-400 mb-2"><ArrowLeft className="w-4 h-4" /> {t('nav.backToArchive')}</Link>
            <h1 className="flex items-center gap-3 text-2xl sm:text-3xl font-black"><BarChart3 className="w-8 h-8 text-pink-500" /> {t('stats.title')}</h1>
            <p className="mt-1 text-sm text-slate-400">{t('stats.archiveSummary')}</p>
          </div>
        </header>

        {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400">{error}</div>}
        {!data && !error ? <div className="py-20 text-center text-slate-500">{t('stats.loading')}</div> : data && <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm"><Icon className={`w-5 h-5 ${color}`} /><p className="mt-3 text-2xl font-black">{formatNumber(value, language)}</p><p className="text-xs text-slate-400">{label}</p></div>)}
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"><h2 className="font-bold mb-5">{t('stats.platformDistribution')}</h2><Bars data={data.platformDistribution} color="bg-sky-500" /></div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"><h2 className="font-bold mb-5">{t('stats.topTags')}</h2><Bars data={data.topTags} /></div>
          </section>

          <section className="grid lg:grid-cols-[1fr_260px] gap-4">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"><h2 className="font-bold mb-3">{t('stats.trend')}</h2><TrendChart data={data.trend} /></div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 flex flex-col items-center justify-center text-center">
              <BadgeCheck className="w-7 h-7 text-emerald-400 mb-3" />
              <div className="relative w-32 h-32 rounded-full grid place-items-center" style={{ background: `conic-gradient(#34d399 ${data.verified.percentage}%, var(--border-color) 0)` }}><div className="w-24 h-24 rounded-full bg-[var(--bg-card)] grid place-items-center"><span className="text-2xl font-black">%{data.verified.percentage}</span></div></div>
              <h2 className="mt-4 font-bold">{t('stats.verifiedRate')}</h2><p className="text-xs text-slate-400">{t('stats.profileCount', { count: `${formatNumber(data.verified.count, language)} / ${formatNumber(data.verified.total, language)}` })}</p>
            </div>
          </section>
        </>}
      </div>
    </main>
  );
}
