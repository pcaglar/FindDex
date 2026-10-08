import prisma from '@/lib/prisma';
import { permanentlyDeleteProfile } from '@/lib/profileService';
import { ensureSystemDefaults, SYSTEM_COLLECTION_NAMES, SYSTEM_PLATFORMS } from '../../prisma/systemDefaults';

export async function clearVaultData() {
  const profiles = await prisma.profile.findMany({ select: { id: true } });
  for (const profile of profiles) {
    const deleted = await permanentlyDeleteProfile(profile.id);
    if (!deleted) throw new Error(`Profile could not be deleted: ${profile.id}`);
  }
  await prisma.$transaction(async (tx) => {
    await tx.tag.deleteMany();
    await tx.collection.deleteMany({ where: { name: { notIn: [...SYSTEM_COLLECTION_NAMES] } } });
    await tx.platform.deleteMany({
      where: { isCustom: true, key: { notIn: SYSTEM_PLATFORMS.map((platform) => platform.key) } },
    });
    await ensureSystemDefaults(tx);
  });
  return { profiles: profiles.length };
}
