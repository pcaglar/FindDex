import prisma from '@/lib/prisma';

export const EXPORT_VERSION = 1;

export async function createExportSnapshot() {
  const [profiles, platforms, platformLinks, tags, profileTags, collections, profileCollections, profileImages, activityLogs] =
    await prisma.$transaction([
      prisma.profile.findMany(),
      prisma.platform.findMany(),
      prisma.platformLink.findMany(),
      prisma.tag.findMany(),
      prisma.profileTag.findMany(),
      prisma.collection.findMany(),
      prisma.profileCollection.findMany(),
      prisma.profileImage.findMany(),
      prisma.activityLog.findMany(),
    ]);

  return {
    format: 'finddex-export',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: { profiles, platforms, platformLinks, tags, profileTags, collections, profileCollections, profileImages, activityLogs },
  };
}

export function assertValidSnapshot(snapshot: any) {
  if (!snapshot || !['finddex-export', 'modelvault-export'].includes(snapshot.format) || !snapshot.data) {
    throw new Error('This file is not a valid FindDex export.');
  }

  const required = [
    'profiles', 'platforms', 'platformLinks', 'tags',
    'profileTags', 'collections', 'profileCollections',
  ];
  for (const key of required) {
    if (!Array.isArray(snapshot.data[key])) {
      throw new Error(`The export file is missing "${key}" data.`);
    }
  }
  if (!Array.isArray(snapshot.data.profileImages)) {
    snapshot.data.profileImages = snapshot.data.profiles
      .filter((profile: any) => profile.avatarUrl)
      .map((profile: any) => ({
        id: `legacy_${profile.id}`,
        profileId: profile.id,
        url: profile.avatarUrl,
        isCover: true,
        sortOrder: 0,
        createdAt: profile.createdAt,
      }));
  }
  if (!Array.isArray(snapshot.data.activityLogs)) snapshot.data.activityLogs = [];
  return snapshot;
}

const dateOrUndefined = (value: unknown) => value ? new Date(String(value)) : undefined;
const dateOrNull = (value: unknown) => value ? new Date(String(value)) : null;

export async function importSnapshot(snapshotInput: any, mode: 'merge' | 'replace') {
  const snapshot = assertValidSnapshot(snapshotInput);
  const source = snapshot.data;

  if (mode === 'replace') {
    await prisma.$transaction(async (tx) => {
      await tx.profileTag.deleteMany();
      await tx.profileCollection.deleteMany();
      await tx.profileImage.deleteMany();
      await tx.activityLog.deleteMany();
      await tx.platformLink.deleteMany();
      await tx.profile.deleteMany();
      await tx.platform.deleteMany();
      await tx.tag.deleteMany();
      await tx.collection.deleteMany();

      if (source.platforms.length) {
        await tx.platform.createMany({ data: source.platforms.map((item: any) => ({
          id: item.id,
          key: item.key,
          name: item.name,
          icon: item.icon,
          color: item.color,
          isCustom: Boolean(item.isCustom),
          createdAt: dateOrUndefined(item.createdAt),
        })) });
      }
      if (source.tags.length) {
        await tx.tag.createMany({ data: source.tags.map((item: any) => ({
          id: item.id,
          name: item.name,
          color: item.color || 'pink',
          createdAt: dateOrUndefined(item.createdAt),
        })) });
      }
      if (source.collections.length) {
        await tx.collection.createMany({ data: source.collections.map((item: any) => ({
          id: item.id,
          name: item.name,
          createdAt: dateOrUndefined(item.createdAt),
        })) });
      }
      if (source.profiles.length) {
        await tx.profile.createMany({ data: source.profiles.map((item: any) => ({
          id: item.id,
          username: item.username,
          displayName: item.displayName,
          avatarUrl: item.avatarUrl,
          coverUrl: item.coverUrl || null,
          bio: item.bio || null,
          notes: item.notes || null,
          isFavorite: Boolean(item.isFavorite),
          isVerified: Boolean(item.isVerified),
          deletedAt: dateOrNull(item.deletedAt),
          createdAt: dateOrUndefined(item.createdAt),
          updatedAt: dateOrUndefined(item.updatedAt) || new Date(),
        })) });
      }
      if (source.platformLinks.length) {
        await tx.platformLink.createMany({ data: source.platformLinks.map((item: any) => ({
          id: item.id,
          profileId: item.profileId,
          platformId: item.platformId,
          url: item.url,
          label: item.label || null,
          createdAt: dateOrUndefined(item.createdAt),
        })) });
      }
      if (source.profileImages.length) {
        await tx.profileImage.createMany({ data: source.profileImages.map((item: any) => ({
          id: item.id,
          profileId: item.profileId,
          url: item.url,
          isCover: Boolean(item.isCover),
          sortOrder: Number(item.sortOrder) || 0,
          createdAt: dateOrUndefined(item.createdAt),
        })) });
      }
      if (source.activityLogs.length) {
        await tx.activityLog.createMany({ data: source.activityLogs.map((item: any) => ({
          id: item.id,
          profileId: item.profileId,
          action: item.action,
          detail: item.detail,
          createdAt: dateOrUndefined(item.createdAt),
        })) });
      }
      if (source.profileTags.length) {
        await tx.profileTag.createMany({ data: source.profileTags });
      }
      if (source.profileCollections.length) {
        await tx.profileCollection.createMany({ data: source.profileCollections });
      }
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const platformIds = new Map<string, string>();
      for (const item of source.platforms) {
        const platform = await tx.platform.upsert({
          where: { key: item.key },
          update: { name: item.name, icon: item.icon, color: item.color, isCustom: Boolean(item.isCustom) },
          create: { key: item.key, name: item.name, icon: item.icon, color: item.color, isCustom: Boolean(item.isCustom) },
        });
        platformIds.set(item.id, platform.id);
      }

      const tagIds = new Map<string, string>();
      for (const item of source.tags) {
        const tag = await tx.tag.upsert({
          where: { name: item.name },
          update: { color: item.color || 'pink' },
          create: { name: item.name, color: item.color || 'pink' },
        });
        tagIds.set(item.id, tag.id);
      }

      const collectionIds = new Map<string, string>();
      for (const item of source.collections) {
        const collection = await tx.collection.upsert({
          where: { name: item.name }, update: {}, create: { name: item.name },
        });
        collectionIds.set(item.id, collection.id);
      }

      const existingProfiles = await tx.profile.findMany();
      const profilesByUsername = new Map(existingProfiles.map((profile) => [profile.username.toLowerCase(), profile]));
      const profileIds = new Map<string, string>();

      for (const item of source.profiles) {
        const scalarData = {
          username: item.username,
          displayName: item.displayName,
          avatarUrl: item.avatarUrl,
          coverUrl: item.coverUrl || null,
          bio: item.bio || null,
          notes: item.notes || null,
          isFavorite: Boolean(item.isFavorite),
          isVerified: Boolean(item.isVerified),
          deletedAt: dateOrNull(item.deletedAt),
        };
        const existing = profilesByUsername.get(String(item.username).toLowerCase());
        const profile = existing
          ? await tx.profile.update({ where: { id: existing.id }, data: scalarData })
          : await tx.profile.create({ data: scalarData });
        profilesByUsername.set(profile.username.toLowerCase(), profile);
        profileIds.set(item.id, profile.id);
      }

      for (const [sourceProfileId, targetProfileId] of profileIds) {
        await tx.platformLink.deleteMany({ where: { profileId: targetProfileId } });
        await tx.profileTag.deleteMany({ where: { profileId: targetProfileId } });
        await tx.profileCollection.deleteMany({ where: { profileId: targetProfileId } });
        await tx.profileImage.deleteMany({ where: { profileId: targetProfileId } });
        await tx.activityLog.deleteMany({ where: { profileId: targetProfileId } });

        const links = source.platformLinks.filter((item: any) => item.profileId === sourceProfileId);
        for (const item of links) {
          const platformId = platformIds.get(item.platformId);
          if (platformId) {
            await tx.platformLink.create({ data: {
              profileId: targetProfileId, platformId, url: item.url, label: item.label || null,
            } });
          }
        }
        for (const item of source.profileTags.filter((row: any) => row.profileId === sourceProfileId)) {
          const tagId = tagIds.get(item.tagId);
          if (tagId) await tx.profileTag.create({ data: { profileId: targetProfileId, tagId } });
        }
        for (const item of source.profileCollections.filter((row: any) => row.profileId === sourceProfileId)) {
          const collectionId = collectionIds.get(item.collectionId);
          if (collectionId) await tx.profileCollection.create({ data: { profileId: targetProfileId, collectionId } });
        }
        const images = source.profileImages.filter((row: any) => row.profileId === sourceProfileId);
        if (images.length) {
          await tx.profileImage.createMany({ data: images.map((item: any, index: number) => ({
            profileId: targetProfileId,
            url: item.url,
            isCover: Boolean(item.isCover),
            sortOrder: Number(item.sortOrder) || index,
          })) });
        }
        const logs = source.activityLogs.filter((row: any) => row.profileId === sourceProfileId);
        if (logs.length) {
          await tx.activityLog.createMany({ data: logs.map((item: any) => ({
            profileId: targetProfileId,
            action: item.action,
            detail: item.detail,
            createdAt: dateOrUndefined(item.createdAt),
          })) });
        }
      }
    });
  }

  return { profiles: source.profiles.length, mode };
}
