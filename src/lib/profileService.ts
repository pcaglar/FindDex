import prisma from './prisma';
import { Profile, PlatformItem, PlatformLinkItem, SortOption } from '@/types/profile';
import fs from 'fs';
import path from 'path';
import { safeUploadPath } from './uploadStorage';
import { getAppSettings } from './appSettings';

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
            in: ['Sonra Bak', 'sonra bak', 'Watch Later'],
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

function buildProfileOrderBy(sort: SortOption = 'newest') {
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
  const orderBy = buildProfileOrderBy(options.sort);

  const rawProfiles = await prisma.profile.findMany({
    where,
    orderBy,
    include: profileInclude,
  });

  return rawProfiles.map(formatProfile);
}

export async function getProfilesPage(options: ProfileQueryOptions & { page: number; pageSize: number }) {
  const where = buildProfileWhere(options);
  const orderBy = buildProfileOrderBy(options.sort);
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
  platformLinks?: {
    platformId?: string;
    platformKey?: string;
    url: string;
    label?: string;
  }[];
  images?: { url: string; isCover?: boolean; sortOrder?: number }[];
  // legacy single platform link support
  platform?: string;
  profileUrl?: string;
  websiteUrl?: string;
}): Promise<Profile> {
  const tags = data.tags || [];
  const collections = data.collections || [];
  const normalizedImages = (data.images || [])
    .filter((image) => image.url?.trim())
    .map((image, index) => ({
      url: image.url.trim(),
      isCover: Boolean(image.isCover),
      sortOrder: image.sortOrder ?? index,
    }));
  if (!normalizedImages.length && data.avatarUrl?.trim()) {
    normalizedImages.push({ url: data.avatarUrl.trim(), isCover: true, sortOrder: 0 });
  }
  if (normalizedImages.length && !normalizedImages.some((image) => image.isCover)) normalizedImages[0].isCover = true;
  const coverUrl = normalizedImages.find((image) => image.isCover)?.url || data.avatarUrl.trim();

  // Prepare platform links
  const linksToCreate: { platformId: string; url: string; label?: string }[] = [];

  if (Array.isArray(data.platformLinks) && data.platformLinks.length > 0) {
    for (const l of data.platformLinks) {
      if (!l.url) continue;
      let platId = l.platformId;
      if (!platId && l.platformKey) {
        const plat = await prisma.platform.findUnique({ where: { key: l.platformKey } });
        platId = plat?.id;
      }
      if (platId) {
        linksToCreate.push({ platformId: platId, url: l.url, label: l.label });
      }
    }
  } else if (data.platform || data.profileUrl) {
    // Legacy fallback
    const key = data.platform || 'instagram';
    const plat = await prisma.platform.findUnique({ where: { key } });
    if (plat && data.profileUrl) {
      linksToCreate.push({ platformId: plat.id, url: data.profileUrl });
    }
    if (data.websiteUrl && data.websiteUrl.trim()) {
      const webPlat = await prisma.platform.findUnique({ where: { key: 'website' } });
      if (webPlat) {
        linksToCreate.push({ platformId: webPlat.id, url: data.websiteUrl.trim(), label: 'Website' });
      }
    }
  }

  // Create profile
  const profile = await prisma.profile.create({
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
      platformLinks: {
        create: linksToCreate,
      },
      images: { create: normalizedImages },
      activityLogs: { create: { action: 'CREATED', detail: 'Profile created' } },
    },
  });

  // Connect or create tags
  for (const t of tags) {
    if (!t.trim()) continue;
    const tag = await prisma.tag.upsert({
      where: { name: t.trim() },
      update: {},
      create: { name: t.trim() },
    });
    await prisma.profileTag.create({
      data: {
        profileId: profile.id,
        tagId: tag.id,
      },
    });
  }

  // Connect or create collections
  for (const c of collections) {
    if (!c.trim()) continue;
    const col = await prisma.collection.upsert({
      where: { name: c.trim() },
      update: {},
      create: { name: c.trim() },
    });
    await prisma.profileCollection.create({
      data: {
        profileId: profile.id,
        collectionId: col.id,
      },
    });
  }

  return (await getProfileById(profile.id))!;
}

export async function updateProfile(id: string, patch: any): Promise<Profile | null> {
  const existing = await prisma.profile.findUnique({
    where: { id },
    include: {
      images: true,
      tags: { include: { tag: true } },
      collections: { include: { collection: true } },
    },
  });
  if (!existing) return null;

  const activity: { action: string; detail: string }[] = [];
  const compact = (value: unknown) => String(value ?? '').trim().slice(0, 500) || '—';

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

  await prisma.profile.update({
    where: { id },
    data: dataToUpdate,
  });

  if (normalizedImages) {
    await prisma.profileImage.deleteMany({ where: { profileId: id } });
    if (normalizedImages.length) {
      await prisma.profileImage.createMany({ data: normalizedImages.map((image) => ({ ...image, profileId: id })) });
    }
  }

  // Update tags if provided
  if (Array.isArray(patch.tags)) {
    const previousTags = new Set(existing.tags.map((row) => row.tag.name));
    const nextTags = new Set<string>(patch.tags.map((tag: string) => tag.trim()).filter(Boolean));
    nextTags.forEach((tag) => { if (!previousTags.has(tag)) activity.push({ action: 'TAG_ADDED', detail: `Tag added: ${tag}` }); });
    previousTags.forEach((tag) => { if (!nextTags.has(tag)) activity.push({ action: 'TAG_REMOVED', detail: `Tag removed: ${tag}` }); });
    await prisma.profileTag.deleteMany({ where: { profileId: id } });
    for (const t of patch.tags) {
      if (!t.trim()) continue;
      const tag = await prisma.tag.upsert({
        where: { name: t.trim() },
        update: {},
        create: { name: t.trim() },
      });
      await prisma.profileTag.create({
        data: {
          profileId: id,
          tagId: tag.id,
        },
      });
    }
  }

  // Update collections if provided
  if (Array.isArray(patch.collections)) {
    const previousCollections = new Set(existing.collections.map((row) => row.collection.name));
    const nextCollections = new Set<string>(patch.collections.map((collection: string) => collection.trim()).filter(Boolean));
    nextCollections.forEach((collection) => { if (!previousCollections.has(collection)) activity.push({ action: 'COLLECTION_ADDED', detail: `Added to collection: ${collection}` }); });
    previousCollections.forEach((collection) => { if (!nextCollections.has(collection)) activity.push({ action: 'COLLECTION_REMOVED', detail: `Removed from collection: ${collection}` }); });
    await prisma.profileCollection.deleteMany({ where: { profileId: id } });
    for (const c of patch.collections) {
      if (!c.trim()) continue;
      const col = await prisma.collection.upsert({
        where: { name: c.trim() },
        update: {},
        create: { name: c.trim() },
      });
      await prisma.profileCollection.create({
        data: {
          profileId: id,
          collectionId: col.id,
        },
      });
    }
  }

  // Update platform links if provided
  if (Array.isArray(patch.platformLinks)) {
    await prisma.platformLink.deleteMany({ where: { profileId: id } });
    for (const l of patch.platformLinks) {
      if (!l.url) continue;
      let platId = l.platformId;
      if (!platId && l.platformKey) {
        const plat = await prisma.platform.findUnique({ where: { key: l.platformKey } });
        platId = plat?.id;
      }
      if (platId) {
        await prisma.platformLink.create({
          data: {
            profileId: id,
            platformId: platId,
            url: l.url.trim(),
            label: l.label || null,
          },
        });
      }
    }
  }

  const editableFields = ['username', 'displayName', 'avatarUrl', 'coverUrl', 'bio', 'isVerified', 'images', 'platformLinks'];
  const hasGeneralEdit = editableFields.some((field) => patch[field] !== undefined) && activity.every((entry) => entry.action !== 'EDITED');
  if (hasGeneralEdit) activity.push({ action: 'EDITED', detail: 'Profile details edited' });
  if (activity.length) {
    await prisma.activityLog.createMany({ data: activity.map((entry) => ({ ...entry, profileId: id })) });
  }

  for (const url of removedImageUrls) await deleteLocalUploadIfUnused(url);
  return await getProfileById(id);
}

async function deleteLocalUploadIfUnused(url: string) {
  const localPrefixes = ['/uploads/', '/api/uploads/'];
  const prefix = localPrefixes.find((candidate) => url.startsWith(candidate));
  if (!prefix) return;
  const imageReference = await prisma.profileImage.count({ where: { url } });
  const legacyReference = await prisma.profile.count({ where: { avatarUrl: url } });
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

    const localUrls = Array.from(new Set([...profile.images.map((image) => image.url), profile.avatarUrl]));
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
        select: {
          profileId: true,
        },
      },
    },
  });

  return platforms.map((p) => {
    // Unique profile count for this platform
    return {
      id: p.id,
      key: p.key,
      name: p.name,
      icon: p.icon,
      color: p.color,
      isCustom: p.isCustom,
      count: p.links.length,
    };
  });
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
    p.collections.some((c) => c.collection.name.toLowerCase() === 'sonra bak')
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
