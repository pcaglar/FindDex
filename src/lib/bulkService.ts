import prisma from './prisma';
import { permanentlyDeleteProfile } from './profileService';

export const MAX_BULK_IDS = 500;

import { BULK_ACTIONS, BulkAction } from './bulkTypes';

export type { BulkAction };

export class BulkInputError extends Error {}

const WRITE_TRANSACTION = { maxWait: 10_000, timeout: 60_000 } as const;

export function parseBulkIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw new BulkInputError('ids must be an array');
  const ids = Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64)));
  if (!ids.length) throw new BulkInputError('Select at least one profile');
  if (ids.length > MAX_BULK_IDS) throw new BulkInputError(`At most ${MAX_BULK_IDS} profiles per request`);
  return ids;
}

const cleanNames = (value: unknown) =>
  Array.from(new Set((Array.isArray(value) ? value : []).map((name) => String(name ?? '').trim()).filter((name) => name && name.length <= 100)));

/** Applies one change to many active profiles atomically. Returns how many profiles actually changed. */
export async function bulkUpdateProfiles(input: { ids: string[]; action: BulkAction; tags?: unknown; collections?: unknown }) {
  const { action } = input;
  if (!BULK_ACTIONS.includes(action)) throw new BulkInputError('Unknown action');
  const tagNames = cleanNames(input.tags);
  const collectionNames = cleanNames(input.collections);
  if ((action === 'addTags' || action === 'removeTags') && !tagNames.length) throw new BulkInputError('Choose at least one tag');
  if ((action === 'addCollections' || action === 'removeCollections') && !collectionNames.length) throw new BulkInputError('Choose at least one collection');

  return prisma.$transaction(async (tx) => {
    const profiles = await tx.profile.findMany({ where: { id: { in: input.ids }, deletedAt: null }, select: { id: true, isFavorite: true } });
    const ids = profiles.map((profile) => profile.id);
    if (!ids.length) return { affected: 0 };
    const log = (entries: { profileId: string; action: string; detail: string }[]) =>
      entries.length ? tx.activityLog.createMany({ data: entries }) : Promise.resolve();

    if (action === 'trash') {
      await tx.profile.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
      return { affected: ids.length };
    }

    if (action === 'favorite' || action === 'unfavorite') {
      const target = action === 'favorite';
      const changed = profiles.filter((profile) => profile.isFavorite !== target).map((profile) => profile.id);
      if (changed.length) {
        await tx.profile.updateMany({ where: { id: { in: changed } }, data: { isFavorite: target } });
        await log(changed.map((profileId) => ({
          profileId,
          action: target ? 'FAVORITED' : 'UNFAVORITED',
          detail: target ? 'Profile added to favorites' : 'Profile removed from favorites',
        })));
      }
      return { affected: changed.length };
    }

    const isTag = action === 'addTags' || action === 'removeTags';
    const names = isTag ? tagNames : collectionNames;
    const adding = action === 'addTags' || action === 'addCollections';

    if (adding) {
      const rows = isTag
        ? await Promise.all(names.map((name) => tx.tag.upsert({ where: { name }, update: {}, create: { name } })))
        : await Promise.all(names.map((name) => tx.collection.upsert({ where: { name }, update: {}, create: { name } })));
      const touched = new Set<string>();
      const entries: { profileId: string; action: string; detail: string }[] = [];
      for (const row of rows) {
        const existing = isTag
          ? await tx.profileTag.findMany({ where: { tagId: row.id, profileId: { in: ids } }, select: { profileId: true } })
          : await tx.profileCollection.findMany({ where: { collectionId: row.id, profileId: { in: ids } }, select: { profileId: true } });
        const have = new Set(existing.map((link) => link.profileId));
        const missing = ids.filter((id) => !have.has(id));
        if (!missing.length) continue;
        if (isTag) await tx.profileTag.createMany({ data: missing.map((profileId) => ({ profileId, tagId: row.id })) });
        else await tx.profileCollection.createMany({ data: missing.map((profileId) => ({ profileId, collectionId: row.id })) });
        missing.forEach((profileId) => {
          touched.add(profileId);
          entries.push({
            profileId,
            action: isTag ? 'TAG_ADDED' : 'COLLECTION_ADDED',
            detail: isTag ? `Tag added: ${row.name}` : `Added to collection: ${row.name}`,
          });
        });
      }
      await log(entries);
      return { affected: touched.size };
    }

    const rows = isTag
      ? await tx.tag.findMany({ where: { name: { in: names } } })
      : await tx.collection.findMany({ where: { name: { in: names } } });
    const touched = new Set<string>();
    const entries: { profileId: string; action: string; detail: string }[] = [];
    for (const row of rows) {
      const existing = isTag
        ? await tx.profileTag.findMany({ where: { tagId: row.id, profileId: { in: ids } }, select: { profileId: true } })
        : await tx.profileCollection.findMany({ where: { collectionId: row.id, profileId: { in: ids } }, select: { profileId: true } });
      if (!existing.length) continue;
      const present = existing.map((link) => link.profileId);
      if (isTag) await tx.profileTag.deleteMany({ where: { tagId: row.id, profileId: { in: present } } });
      else await tx.profileCollection.deleteMany({ where: { collectionId: row.id, profileId: { in: present } } });
      present.forEach((profileId) => {
        touched.add(profileId);
        entries.push({
          profileId,
          action: isTag ? 'TAG_REMOVED' : 'COLLECTION_REMOVED',
          detail: isTag ? `Tag removed: ${row.name}` : `Removed from collection: ${row.name}`,
        });
      });
    }
    await log(entries);
    return { affected: touched.size };
  }, WRITE_TRANSACTION);
}

/** Restores trashed profiles. */
export async function bulkRestoreProfiles(ids: string[]) {
  return prisma.$transaction(async (tx) => {
    const trashed = await tx.profile.findMany({ where: { id: { in: ids }, deletedAt: { not: null } }, select: { id: true } });
    const restoreIds = trashed.map((profile) => profile.id);
    if (!restoreIds.length) return { affected: 0 };
    await tx.profile.updateMany({ where: { id: { in: restoreIds } }, data: { deletedAt: null } });
    await tx.activityLog.createMany({ data: restoreIds.map((profileId) => ({ profileId, action: 'RESTORED_FROM_TRASH', detail: 'Profile restored from Trash' })) });
    return { affected: restoreIds.length };
  }, WRITE_TRANSACTION);
}

/** Permanently deletes trashed profiles (and their now-unused local images). */
export async function bulkDeleteTrashedProfiles(ids: string[]) {
  const trashed = await prisma.profile.findMany({ where: { id: { in: ids }, deletedAt: { not: null } }, select: { id: true } });
  let affected = 0;
  for (const { id } of trashed) if (await permanentlyDeleteProfile(id)) affected += 1;
  return { affected };
}
