import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { Profile, PlatformItem, PlatformLinkItem, SortOption } from '@/types/profile';
import fs from 'fs';
import path from 'path';
import { safeUploadPath } from './uploadStorage';
import { getAppSettings } from './appSettings';
import { isWatchLaterCollection, WATCH_LATER_ALIASES } from './systemCollections';

export function formatProfile(p: any): Profile {
  const platformLinks: PlatformLinkItem[] = (p.platformLinks || []).map((pl: any) => ({
    id: pl.id,
    platformId: pl.platformId,
    platformKey: pl.platform?.key || 'website',
    platformName: pl.platform?.name || 'Website',
    platformIcon: pl.platform?.icon || 'website',
    platformColor: pl.platform?.color || 'from-blue-600 to-indigo-600',
    url: pl.url,
    label: pl.label || null,
  }));

  const tags: string[] = (p.tags || []).map((pt: any) => pt.tag?.name).filter(Boolean);
  const collections: string[] = (p.collections || []).map((pc: any) => pc.collection?.name).filter(Boolean);
  const images = (p.images || [])
    .slice()
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    .map((image: any) => ({
      id: image.id,
      url: image.url,
      isCover: image.isCover,
      sortOrder: image.sortOrder,
      createdAt: image.createdAt?.toISOString?.() || image.createdAt,
    }));
  const coverImage = images.find((image: any) => image.isCover) || images[0];

  // Primary platform & profileUrl fallback
  const firstLink = platformLinks[0];
  const websiteLink = platformLinks.find((pl) => pl.platformKey === 'website');

  return {
    id: p.id,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: coverImage?.url || p.avatarUrl,
    coverUrl: p.coverUrl || null,
    bio: p.bio || null,
    notes: p.notes || null,
    isFavorite: p.isFavorite,
    isVerified: p.isVerified,
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    platformLinks,
    images,
    tags,
    collections,
    platform: firstLink ? firstLink.platformKey : 'website',
    profileUrl: firstLink ? firstLink.url : '',
    websiteUrl: websiteLink ? websiteLink.url : undefined,
  };
}

type ProfileQueryOptions = {
  includeDeleted?: boolean;
  search?: string;
  platformKey?: string;
  tag?: string;
  collection?: string;
  filter?: string;
  sort?: SortOption;
};

function buildProfileWhere(options: ProfileQueryOptions) {
  const {
    includeDeleted = false,
    search,
    platformKey,
    tag,
    collection,
    filter,
  } = options;

  const where: any = {};

  if (!includeDeleted) {
    where.deletedAt = null;
  } else {
    where.deletedAt = { not: null };
  }

  if (filter === 'favorites') {
    where.isFavorite = true;
  }

  if (platformKey && platformKey !== 'all') {
    where.platformLinks = {
      some: {
        platform: {
          key: platformKey,
        },
      },
    };
  }

  if (tag) {
    where.tags = {
      some: {
        tag: {
          name: {
            equals: tag,
          },
        },
      },
    };
  }

  if (collection) {
    where.collections = {
      some: {
        collection: {
          name: {
            equals: collection,
          },
        },
      },
    };
  }

  if (filter === 'later') {
    where.collections = {
      some: {
        collection: {
          name: {
            in: WATCH_LATER_ALIASES,
          },
        },
      },
    };
  }

  if (filter === 'hasWebsite') {
    where.platformLinks = {
      some: {
        platform: {
          key: 'website',
        },
      },
    };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { username: { contains: q } },
      { displayName: { contains: q } },
      { bio: { contains: q } },
      { notes: { contains: q } },
      {
        tags: {
          some: {
            tag: {
              name: { contains: q },
            },
          },
        },
      },
      {
        platformLinks: {
          some: {
            url: { contains: q },
          },
        },
      },
    ];
  }

  return where;
}

function buildProfileOrderBy(sort: SortOption = 'newest', includeDeleted = false) {
  // Trash lists the most recently deleted profiles first.
  if (includeDeleted) return { deletedAt: 'desc' as const };
  let orderBy: any = { createdAt: 'desc' };
  switch (sort) {
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'name-asc':
      orderBy = { displayName: 'asc' };
      break;
    case 'name-desc':
      orderBy = { displayName: 'desc' };
      break;
    case 'favorites':
      orderBy = [{ isFavorite: 'desc' }, { createdAt: 'desc' }];
      break;
    case 'newest':
    default:
      orderBy = { createdAt: 'desc' };
      break;
  }

  return orderBy;
}

const profileInclude = {
  platformLinks: {
    include: {
      platform: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
  collections: {
    include: {
      collection: true,
    },
  },
  images: { orderBy: { sortOrder: 'asc' as const } },
};

export async function getProfiles(options: ProfileQueryOptions = {}): Promise<Profile[]> {
  const where = buildProfileWhere(options);
  const orderBy = buildProfileOrderBy(options.sort, options.includeDeleted);

  const rawProfiles = await prisma.profile.findMany({
    where,
    orderBy,
    include: profileInclude,
  });

  return rawProfiles.map(formatProfile);
}

export async function getProfilesPage(options: ProfileQueryOptions & { page: number; pageSize: number }) {
  const where = buildProfileWhere(options);
  const orderBy = buildProfileOrderBy(options.sort, options.includeDeleted);
  const page = Math.max(1, Math.floor(options.page));
  const pageSize = Math.max(1, Math.floor(options.pageSize));
  const [total, rawProfiles] = await prisma.$transaction([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: profileInclude,
    }),
  ]);

  return {
    profiles: rawProfiles.map(formatProfile),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const p = await prisma.profile.findUnique({
    where: { id },
    include: {
      platformLinks: {
        include: {
          platform: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      collections: {
        include: {
          collection: true,
        },
      },
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  return p ? formatProfile(p) : null;
}

type PlatformLinkInput = { platformId?: string; platformKey?: string; url: string; label?: string };
type ProfileImageInput = { url: string; isCover?: boolean; sortOrder?: number };
type TransactionClient = Prisma.TransactionClient;

// SQLite is single-writer; profile writes touch many rows, so give them room.
const WRITE_TRANSACTION = { maxWait: 10_000, timeout: 30_000 } as const;

const uniqueNames = (values: unknown): string[] =>
  Array.from(new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean)));

async function resolvePlatformLinks(tx: TransactionClient, links: PlatformLinkInput[]) {
  const resolved: { platformId: string; url: string; label: string | null }[] = [];
  for (const link of links) {
    const url = link.url?.trim();
    if (!url) continue;
    let platformId = link.platformId;
    if (!platformId && link.platformKey) {
      platformId = (await tx.platform.findUnique({ where: { key: link.platformKey } }))?.id;
    }
    if (platformId) resolved.push({ platformId, url, label: link.label || null });
  }
  return resolved;
}

async function connectTags(tx: TransactionClient, profileId: string, names: string[]) {
  for (const name of names) {
    const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
    await tx.profileTag.create({ data: { profileId, tagId: tag.id } });
  }
}

async function connectCollections(tx: TransactionClient, profileId: string, names: string[]) {
  for (const name of names) {
    const collection = await tx.collection.upsert({ where: { name }, update: {}, create: { name } });
    await tx.profileCollection.create({ data: { profileId, collectionId: collection.id } });
  }
}

export async function createProfile(data: {
  username: string;
  displayName: string;
  avatarUrl: string;
  coverUrl?: string;
  bio?: string;
  notes?: string;
  isFavorite?: boolean;
  isVerified?: boolean;
  tags?: string[];
  collections?: string[];
  platformLinks?: PlatformLinkInput[];
  images?: ProfileImageInput[];
  // legacy single platform link support
  platform?: string;
  profileUrl?: string;
  websiteUrl?: string;
}): Promise<Profile> {
  const tags = uniqueNames(data.tags);
  const collections = uniqueNames(data.collections);
  const avatarUrl = (data.avatarUrl || '').trim();
  const normalizedImages = (data.images || [])
    .filter((image) => image.url?.trim())
    .map((image, index) => ({
      url: image.url.trim(),
      isCover: Boolean(image.isCover),
      sortOrder: image.sortOrder ?? index,
    }));
  if (!normalizedImages.length && avatarUrl) {
    normalizedImages.push({ url: avatarUrl, isCover: true, sortOrder: 0 });
  }
  if (normalizedImages.length && !normalizedImages.some((image) => image.isCover)) normalizedImages[0].isCover = true;
  const coverUrl = normalizedImages.find((image) => image.isCover)?.url || avatarUrl;

  // The profile and every relation are written atomically: a failure leaves nothing behind.
  const profileId = await prisma.$transaction(async (tx) => {
    let requestedLinks: PlatformLinkInput[] = [];
    if (Array.isArray(data.platformLinks) && data.platformLinks.length > 0) {
      requestedLinks = data.platformLinks;
    } else if (data.platform || data.profileUrl) {
      // Legacy fallback
      if (data.profileUrl) requestedLinks.push({ platformKey: data.platform || 'instagram', url: data.profileUrl });
      if (data.websiteUrl?.trim()) requestedLinks.push({ platformKey: 'website', url: data.websiteUrl.trim(), label: 'Website' });
    }
    const linksToCreate = await resolvePlatformLinks(tx, requestedLinks);

    const profile = await tx.profile.create({
      data: {
        username: data.username.replace(/^@/, '').trim(),
        displayName: data.displayName.trim(),
        avatarUrl: coverUrl,
        coverUrl: data.coverUrl || null,
        bio: data.bio || null,
        notes: data.notes || null,
        isFavorite: Boolean(data.isFavorite),
        isVerified: Boolean(data.isVerified),
        deletedAt: null,
        platformLinks: { create: linksToCreate },
        images: { create: normalizedImages },
        activityLogs: { create: { action: 'CREATED', detail: 'Profile created' } },
      },
    });
    await connectTags(tx, profile.id, tags);
    await connectCollections(tx, profile.id, collections);
    return profile.id;
  }, WRITE_TRANSACTION);

  return (await getProfileById(profileId))!;
}

export async function updateProfile(id: string, patch: any): Promise<Profile | null> {
  const compact = (value: unknown) => String(value ?? '').trim().slice(0, 500) || '—';

  // All changes, including the activity log, commit together or not at all.
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.profile.findUnique({
      where: { id },
      include: {
        images: true,
        tags: { include: { tag: true } },
        collections: { include: { collection: true } },
      },
    });
    if (!existing) return null;

    const activity: { action: string; detail: string }[] = [];
    const dataToUpdate: any = {};
    if (patch.username !== undefined) dataToUpdate.username = patch.username.replace(/^@/, '').trim();
    if (patch.displayName !== undefined) dataToUpdate.displayName = patch.displayName.trim();
    if (patch.avatarUrl !== undefined) dataToUpdate.avatarUrl = patch.avatarUrl.trim();
    if (patch.coverUrl !== undefined) dataToUpdate.coverUrl = patch.coverUrl;
    if (patch.bio !== undefined) dataToUpdate.bio = patch.bio;
    if (patch.notes !== undefined) dataToUpdate.notes = patch.notes;
    if (patch.isFavorite !== undefined) dataToUpdate.isFavorite = Boolean(patch.isFavorite);
    if (patch.isVerified !== undefined) dataToUpdate.isVerified = Boolean(patch.isVerified);
    if (patch.deletedAt !== undefined) dataToUpdate.deletedAt = patch.deletedAt;

    if (patch.notes !== undefined && patch.notes !== existing.notes) {
      activity.push({ action: 'NOTE_UPDATED', detail: `Note updated — before: ${compact(existing.notes)}, after: ${compact(patch.notes)}` });
    }
    if (patch.isFavorite !== undefined && Boolean(patch.isFavorite) !== existing.isFavorite) {
      activity.push({
        action: patch.isFavorite ? 'FAVORITED' : 'UNFAVORITED',
        detail: patch.isFavorite ? 'Profile added to favorites' : 'Profile removed from favorites',
      });
    }

    let removedImageUrls: string[] = [];
    let normalizedImages: { url: string; isCover: boolean; sortOrder: number }[] | null = null;
    if (Array.isArray(patch.images)) {
      const nextImages: { url: string; isCover: boolean; sortOrder: number }[] = patch.images
        .filter((image: any) => image.url?.trim())
        .map((image: any, index: number) => ({ url: image.url.trim(), isCover: Boolean(image.isCover), sortOrder: index }));
      if (nextImages.length && !nextImages.some((image) => image.isCover)) nextImages[0].isCover = true;
      normalizedImages = nextImages;
      const nextUrls = new Set(nextImages.map((image) => image.url));
      removedImageUrls = existing.images.map((image) => image.url).filter((url) => !nextUrls.has(url));
      dataToUpdate.avatarUrl = nextImages.find((image) => image.isCover)?.url || nextImages[0]?.url || patch.avatarUrl || existing.avatarUrl;
    }

    await tx.profile.update({ where: { id }, data: dataToUpdate });

    if (normalizedImages) {
      await tx.profileImage.deleteMany({ where: { profileId: id } });
      if (normalizedImages.length) {
        await tx.profileImage.createMany({ data: normalizedImages.map((image) => ({ ...image, profileId: id })) });
      }
    }

    if (Array.isArray(patch.tags)) {
      const previousTags = new Set(existing.tags.map((row) => row.tag.name));
      const nextTags = uniqueNames(patch.tags);
      nextTags.forEach((tag) => { if (!previousTags.has(tag)) activity.push({ action: 'TAG_ADDED', detail: `Tag added: ${tag}` }); });
      previousTags.forEach((tag) => { if (!nextTags.includes(tag)) activity.push({ action: 'TAG_REMOVED', detail: `Tag removed: ${tag}` }); });
      await tx.profileTag.deleteMany({ where: { profileId: id } });
      await connectTags(tx, id, nextTags);
    }

    if (Array.isArray(patch.collections)) {
      const previousCollections = new Set(existing.collections.map((row) => row.collection.name));
      const nextCollections = uniqueNames(patch.collections);
      nextCollections.forEach((collection) => { if (!previousCollections.has(collection)) activity.push({ action: 'COLLECTION_ADDED', detail: `Added to collection: ${collection}` }); });
      previousCollections.forEach((collection) => { if (!nextCollections.includes(collection)) activity.push({ action: 'COLLECTION_REMOVED', detail: `Removed from collection: ${collection}` }); });
      await tx.profileCollection.deleteMany({ where: { profileId: id } });
      await connectCollections(tx, id, nextCollections);
    }

    if (Array.isArray(patch.platformLinks)) {
      const links = await resolvePlatformLinks(tx, patch.platformLinks);
      await tx.platformLink.deleteMany({ where: { profileId: id } });
      if (links.length) {
        await tx.platformLink.createMany({ data: links.map((link) => ({ ...link, profileId: id })) });
      }
    }

    const editableFields = ['username', 'displayName', 'avatarUrl', 'coverUrl', 'bio', 'isVerified', 'images', 'platformLinks'];
    const hasGeneralEdit = editableFields.some((field) => patch[field] !== undefined) && activity.every((entry) => entry.action !== 'EDITED');
    if (hasGeneralEdit) activity.push({ action: 'EDITED', detail: 'Profile details edited' });
    if (activity.length) {
      await tx.activityLog.createMany({ data: activity.map((entry) => ({ ...entry, profileId: id })) });
    }

    return { removedImageUrls };
  }, WRITE_TRANSACTION);

  if (!result) return null;
  // Files are removed only after the database change has committed.
  for (const url of result.removedImageUrls) await deleteLocalUploadIfUnused(url);
  return await getProfileById(id);
}

async function deleteLocalUploadIfUnused(url: string) {
  const localPrefixes = ['/uploads/', '/api/uploads/'];
  const prefix = localPrefixes.find((candidate) => url.startsWith(candidate));
  if (!prefix) return;
  const [imageReference, legacyReference] = await Promise.all([
    prisma.profileImage.count({ where: { url } }),
    prisma.profile.count({ where: { OR: [{ avatarUrl: url }, { coverUrl: url }] } }),
  ]);
  if (imageReference || legacyReference) return;
  const filename = path.basename(url.slice(prefix.length));
  const filePath = safeUploadPath(filename);
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn('Local gallery image could not be deleted', error);
  }
}

// Soft delete
export async function softDeleteProfile(id: string): Promise<boolean> {
  try {
    await prisma.profile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  } catch (err) {
    console.error('Soft delete failed', err);
    return false;
  }
}

// Restore from trash
export async function restoreProfile(id: string): Promise<boolean> {
  try {
    await prisma.profile.update({
      where: { id },
      data: {
        deletedAt: null,
        activityLogs: { create: { action: 'RESTORED_FROM_TRASH', detail: 'Profile restored from Trash' } },
      },
    });
    return true;
  } catch (err) {
    console.error('Restore failed', err);
    return false;
  }
}

// Permanent delete with orphan image cleanup
export async function permanentlyDeleteProfile(id: string): Promise<boolean> {
  try {
    const profile = await prisma.profile.findUnique({ where: { id }, include: { images: true } });
    if (!profile) return false;

    const localUrls = Array.from(new Set([
      ...profile.images.map((image) => image.url),
      profile.avatarUrl,
      ...(profile.coverUrl ? [profile.coverUrl] : []),
    ]));
    await prisma.profile.delete({ where: { id } });
    for (const url of localUrls) await deleteLocalUploadIfUnused(url);
    return true;
  } catch (err) {
    console.error('Permanent delete failed', err);
    return false;
  }
}

// Empty entire trash
export async function emptyTrash(): Promise<number> {
  const trashed = await prisma.profile.findMany({
    where: { deletedAt: { not: null } },
  });

  let count = 0;
  for (const p of trashed) {
    await permanentlyDeleteProfile(p.id);
    count++;
  }
  return count;
}

// Auto clean items older than the configured trash retention.
export async function cleanOldTrash(): Promise<number> {
  const { trashRetentionDays } = await getAppSettings();
  const cutoff = new Date(Date.now() - trashRetentionDays * 24 * 60 * 60 * 1000);
  const oldTrashed = await prisma.profile.findMany({
    where: {
      deletedAt: {
        lte: cutoff,
      },
    },
  });

  let count = 0;
  for (const p of oldTrashed) {
    await permanentlyDeleteProfile(p.id);
    count++;
  }
  return count;
}

// Platforms
export async function getAllPlatforms(): Promise<PlatformItem[]> {
  const platforms = await prisma.platform.findMany({
    orderBy: [{ isCustom: 'asc' }, { createdAt: 'asc' }],
    include: {
      links: {
        // Trashed profiles do not count toward the visible archive.
        where: { profile: { deletedAt: null } },
        select: {
          profileId: true,
        },
      },
    },
  });

  return platforms.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    icon: p.icon,
    color: p.color,
    isCustom: p.isCustom,
    // A profile with several links on one platform is still one profile.
    count: new Set(p.links.map((link) => link.profileId)).size,
  }));
}

export async function createCustomPlatform(data: {
  name: string;
  icon: string;
  color: string;
}): Promise<PlatformItem> {
  const baseKey = data.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_');
  const key = `${baseKey}_${Date.now().toString(36)}`;

  const created = await prisma.platform.create({
    data: {
      key,
      name: data.name.trim(),
      icon: data.icon.trim() || '⭐',
      color: data.color.trim() || 'from-purple-500 to-indigo-600',
      isCustom: true,
    },
  });

  return {
    id: created.id,
    key: created.key,
    name: created.name,
    icon: created.icon,
    color: created.color,
    isCustom: created.isCustom,
    count: 0,
  };
}

// Stats aggregation
export async function getStats() {
  const activeProfiles = await prisma.profile.findMany({
    where: { deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      collections: { include: { collection: true } },
      platformLinks: { include: { platform: true } },
    },
  });

  const trashCount = await prisma.profile.count({
    where: { deletedAt: { not: null } },
  });

  const total = activeProfiles.length;
  const favorites = activeProfiles.filter((p) => p.isFavorite).length;
  const later = activeProfiles.filter((p) =>
    p.collections.some((c) => isWatchLaterCollection(c.collection.name))
  ).length;

  const platformsData = await getAllPlatforms();
  const platforms: Record<string, number> = {};
  platformsData.forEach((plat) => {
    platforms[plat.key] = plat.count || 0;
  });

  const withWebsite = platforms['website'] || 0;

  const tags: Record<string, number> = {};
  const collections: Record<string, number> = {};

  activeProfiles.forEach((p) => {
    p.tags.forEach((pt) => {
      tags[pt.tag.name] = (tags[pt.tag.name] || 0) + 1;
    });
    p.collections.forEach((pc) => {
      collections[pc.collection.name] = (collections[pc.collection.name] || 0) + 1;
    });
  });

  return {
    total,
    favorites,
    later,
    trashCount,
    withWebsite,
    platforms,
    tags,
    collections,
  };
}
