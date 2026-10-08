import type { Prisma } from '@prisma/client';

export const SYSTEM_PLATFORMS = [
  { key: 'instagram', name: 'Instagram', icon: 'instagram', color: 'from-pink-500 via-rose-500 to-amber-500', isCustom: false },
  { key: 'twitter', name: 'X (Twitter)', icon: 'twitter', color: 'from-slate-700 to-slate-900', isCustom: false },
  { key: 'tiktok', name: 'TikTok', icon: 'tiktok', color: 'from-cyan-400 to-pink-500', isCustom: false },
  { key: 'youtube', name: 'YouTube', icon: 'youtube', color: 'from-red-600 to-red-700', isCustom: false },
  { key: 'website', name: 'Website', icon: 'website', color: 'from-blue-600 to-indigo-600', isCustom: false },
] as const;

// Keep legacy database names: UI labels come from sidebar.favorites/watchLater.
export const SYSTEM_COLLECTION_NAMES = ['Favoriler', 'Sonra Bak'] as const;

export async function ensureSystemDefaults(db: Pick<Prisma.TransactionClient, 'platform' | 'collection'>) {
  for (const platform of SYSTEM_PLATFORMS) {
    await db.platform.upsert({
      where: { key: platform.key },
      update: {},
      create: { ...platform },
    });
  }
  for (const name of SYSTEM_COLLECTION_NAMES) {
    await db.collection.upsert({ where: { name }, update: {}, create: { name } });
  }
}
