import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);

    const [total, favorites, collections, trash, verified, platformGroups, tagGroups, createdProfiles, platforms, tags] = await Promise.all([
      prisma.profile.count({ where: { deletedAt: null } }),
      prisma.profile.count({ where: { deletedAt: null, isFavorite: true } }),
      prisma.collection.count(),
      prisma.profile.count({ where: { deletedAt: { not: null } } }),
      prisma.profile.count({ where: { deletedAt: null, isVerified: true } }),
      prisma.platformLink.groupBy({
        by: ['platformId'],
        where: { profile: { deletedAt: null } },
        _count: { profileId: true },
      }),
      prisma.profileTag.groupBy({
        by: ['tagId'],
        where: { profile: { deletedAt: null } },
        _count: { profileId: true },
        orderBy: { _count: { profileId: 'desc' } },
        take: 10,
      }),
      prisma.profile.findMany({
        where: { deletedAt: null, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.platform.findMany({ select: { id: true, name: true, color: true } }),
      prisma.tag.findMany({ select: { id: true, name: true, color: true } }),
    ]);

    const platformMap = new Map(platforms.map((platform) => [platform.id, platform]));
    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
    const trendMap = new Map<string, number>();
    for (let offset = 0; offset < 30; offset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      trendMap.set(date.toISOString().slice(0, 10), 0);
    }
    createdProfiles.forEach(({ createdAt }) => {
      const key = createdAt.toISOString().slice(0, 10);
      trendMap.set(key, (trendMap.get(key) || 0) + 1);
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: { total, favorites, collections, trash },
        platformDistribution: platformGroups
          .map((group) => ({
            name: platformMap.get(group.platformId)?.name || 'Bilinmeyen',
            value: group._count.profileId,
            color: platformMap.get(group.platformId)?.color || '',
          }))
          .sort((a, b) => b.value - a.value),
        topTags: tagGroups.map((group) => ({
          name: tagMap.get(group.tagId)?.name || 'Bilinmeyen',
          value: group._count.profileId,
          color: tagMap.get(group.tagId)?.color || 'pink',
        })),
        trend: Array.from(trendMap, ([date, value]) => ({ date, value })),
        verified: { count: verified, total, percentage: total ? Math.round((verified / total) * 100) : 0 },
      },
    });
  } catch (error) {
    console.error('Detailed stats error', error);
    return NextResponse.json({ success: false, error: 'Statistics could not be prepared' }, { status: 500 });
  }
}
