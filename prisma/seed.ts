import type { PrismaClient } from '@prisma/client';

export const DEMO_PLATFORMS = [
  { key: 'instagram', name: 'Instagram', icon: 'instagram', color: 'from-pink-500 via-rose-500 to-amber-500', isCustom: false },
  { key: 'twitter', name: 'X (Twitter)', icon: 'twitter', color: 'from-slate-700 to-slate-900', isCustom: false },
  { key: 'tiktok', name: 'TikTok', icon: 'tiktok', color: 'from-cyan-400 to-pink-500', isCustom: false },
  { key: 'youtube', name: 'YouTube', icon: 'youtube', color: 'from-red-600 to-red-700', isCustom: false },
  { key: 'website', name: 'Website', icon: 'website', color: 'from-blue-600 to-indigo-600', isCustom: false },
] as const;

export type DemoProfile = {
  id: string; username: string; displayName: string; avatarUrl: string;
  platform: string; profileUrl: string; websiteUrl?: string;
  tags: string[]; collections: string[]; bio: string; notes: string;
  isFavorite: boolean; isVerified: boolean; createdAt: string; updatedAt: string;
};

// Original, immutable FindDex demo dataset. Images are remote Unsplash
// assets, not files in /uploads, so orphan cleanup never treats them as local uploads.
export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'mv-001', username: 'elenarose', displayName: 'Elena Rose', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    platform: 'instagram', profileUrl: 'https://instagram.com/elenarose', websiteUrl: 'https://elenarose.portfolio.me', tags: ['Fashion', 'Europe', 'Brunette', 'Photography'], collections: ['Favoriler', 'Fashion Campaign'],
    bio: 'Living between Milan & Paris. Haute couture, editorial shoots & timeless elegance.', notes: 'Follow up for the 2024 Paris Fashion Week shoots. Management contact details are available on the website.',
    isFavorite: true, isVerified: true, createdAt: '2024-03-10T14:20:00Z', updatedAt: '2024-03-15T10:30:00Z',
  },
  {
    id: 'mv-002', username: 'selinayildiz', displayName: 'Selina Yıldız', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    platform: 'instagram', profileUrl: 'https://instagram.com/selinayildiz', websiteUrl: 'https://selinayildiz.com', tags: ['Fashion', 'Turkey', 'Brunette', 'Travel'], collections: ['Favoriler', 'Sonra Bak'],
    bio: 'Istanbul-based digital content creator and style consultant. Lover of sunny days.', notes: 'A favorite profile for Karaköy and Alaçatı summer collections. Open to collaborations.',
    isFavorite: true, isVerified: true, createdAt: '2024-03-12T09:15:00Z', updatedAt: '2024-03-16T18:40:00Z',
  },
  {
    id: 'mv-003', username: 'astrid_v', displayName: 'Astrid Valkyrie', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    platform: 'tiktok', profileUrl: 'https://tiktok.com/@astrid_v', websiteUrl: 'https://astridvalk.carrd.co', tags: ['Cosplay', 'Gaming', 'Blonde', 'Europe'], collections: ['Sonra Bak', 'Cosplay Reference'],
    bio: 'Nordic cosplayer, fantasy armorer & streamer. Crafting dreams out of foam & steel.', notes: 'The Cyberpunk and Witcher costume designs are incredibly detailed. Also streams on Twitch.',
    isFavorite: false, isVerified: true, createdAt: '2024-03-14T11:00:00Z', updatedAt: '2024-03-14T11:00:00Z',
  },
  {
    id: 'mv-004', username: 'maya_fit', displayName: 'Maya Brooks', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    platform: 'youtube', profileUrl: 'https://youtube.com/@maya_fit', websiteUrl: 'https://mayabrooksfitness.com', tags: ['Fitness', 'Brunette', 'Travel'], collections: ['Favoriler'],
    bio: 'Certified fitness trainer, wellness advocate & plant-based recipes creator.', notes: 'The 30-day workout programs perform very well. She also runs her own activewear brand.',
    isFavorite: true, isVerified: false, createdAt: '2024-03-16T15:30:00Z', updatedAt: '2024-03-18T12:00:00Z',
  },
  {
    id: 'mv-005', username: 'zoe_inked', displayName: 'Zoe Chen', avatarUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
    platform: 'twitter', profileUrl: 'https://x.com/zoe_inked', websiteUrl: 'https://zoetattooart.studio', tags: ['Tattoo', 'Fashion', 'Brunette', 'Photography'], collections: ['Sonra Bak'],
    bio: 'Minimalist fine-line tattoo artist & alternative fashion enthusiast. Berlin.', notes: 'Has a studio in Berlin. Appointments open through the website on the first day of each month.',
    isFavorite: false, isVerified: true, createdAt: '2024-03-17T08:45:00Z', updatedAt: '2024-03-17T08:45:00Z',
  },
  {
    id: 'mv-006', username: 'chloe_lumiere', displayName: 'Chloe Moreau', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    platform: 'instagram', profileUrl: 'https://instagram.com/chloe_lumiere', websiteUrl: 'https://chloemoreau.fr', tags: ['Fashion', 'Blonde', 'Europe', 'Photography'], collections: ['Favoriler', 'Fashion Campaign'],
    bio: 'French Riviera vibes, vintage aesthetics & film photography archive.', notes: 'The Nice and Cannes location shoots are excellent. Uses Kodak Portra-inspired tones.',
    isFavorite: true, isVerified: true, createdAt: '2024-03-18T13:20:00Z', updatedAt: '2024-03-19T09:10:00Z',
  },
  {
    id: 'mv-008', username: 'kai_nordic', displayName: 'Kaija Lindqvist', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    platform: 'website', profileUrl: 'https://kaijalindqvist.design', websiteUrl: 'https://kaijalindqvist.design', tags: ['Photography', 'Europe', 'Blonde', 'Travel'], collections: ['Favoriler'],
    bio: 'Scandinavian visual artist & editorial muse based in Stockholm.', notes: 'Publishes a regular portfolio newsletter on her independent website.',
    isFavorite: true, isVerified: true, createdAt: '2024-03-20T10:10:00Z', updatedAt: '2024-03-20T10:10:00Z',
  },
];

export async function seedDemoData(prisma: PrismaClient) {
  const platformIds = new Map<string, string>();
  for (const item of DEMO_PLATFORMS) {
    const platform = await prisma.platform.upsert({ where: { key: item.key }, update: { ...item }, create: { ...item } });
    platformIds.set(item.key, platform.id);
  }
  for (const item of DEMO_PROFILES) {
    const profile = await prisma.profile.create({ data: {
      id: item.id, username: item.username, displayName: item.displayName, avatarUrl: item.avatarUrl, bio: item.bio, notes: item.notes,
      isFavorite: item.isFavorite, isVerified: item.isVerified, deletedAt: null, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt),
      images: { create: [{ url: item.avatarUrl, isCover: true, sortOrder: 0, createdAt: new Date(item.createdAt) }] },
      activityLogs: { create: [{ action: 'CREATED', detail: 'Demo profile created', createdAt: new Date(item.createdAt) }] },
    } });
    for (const name of item.tags) {
      const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
      await prisma.profileTag.create({ data: { profileId: profile.id, tagId: tag.id } });
    }
    for (const name of item.collections) {
      const collection = await prisma.collection.upsert({ where: { name }, update: {}, create: { name } });
      await prisma.profileCollection.create({ data: { profileId: profile.id, collectionId: collection.id } });
    }
    await prisma.platformLink.create({ data: { profileId: profile.id, platformId: platformIds.get(item.platform)!, url: item.profileUrl } });
    if (item.websiteUrl && !(item.platform === 'website' && item.websiteUrl === item.profileUrl)) {
      await prisma.platformLink.create({ data: { profileId: profile.id, platformId: platformIds.get('website')!, url: item.websiteUrl, label: item.username === 'elenarose' ? 'Portfolio' : null } });
    }
  }
  return { profiles: DEMO_PROFILES.length, tags: new Set(DEMO_PROFILES.flatMap((profile) => profile.tags)).size, collections: new Set(DEMO_PROFILES.flatMap((profile) => profile.collections)).size };
}
