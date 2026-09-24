'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PageToken = number | 'ellipsis-left' | 'ellipsis-right';

export function PaginationControls({ page, pageSize, total, totalPages, onPageChange }: PaginationControlsProps) {
  const { t } = useTranslation();
  const tokens = useMemo<PageToken[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
    if (page >= totalPages - 3) return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, 'ellipsis-left', page - 1, page, page + 1, 'ellipsis-right', totalPages];
  }, [page, totalPages]);

  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav className="mt-7 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#1f293d] dark:bg-[#111827] sm:flex-row" aria-label={t('pagination.aria')}>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {t('pagination.range', { from: start, to: end, total })}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-pink-400 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:text-pink-300"
          aria-label={t('pagination.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t('pagination.previous')}</span>
        </button>

        {tokens.map((token) => typeof token === 'number' ? (
          <button
            type="button"
            key={token}
            onClick={() => onPageChange(token)}
            aria-current={token === page ? 'page' : undefined}
            className={`h-9 min-w-9 rounded-lg px-2 text-xs font-bold transition ${
              token === page
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-pink-300'
            }`}
          >
            {token}
          </button>
        ) : (
          <span key={token} className="min-w-7 text-center text-sm text-slate-400">…</span>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-pink-400 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:text-pink-300"
          aria-label={t('pagination.next')}
        >
          <span className="hidden sm:inline">{t('pagination.next')}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
