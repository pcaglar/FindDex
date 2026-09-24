import prisma from '@/lib/prisma';
import { permanentlyDeleteProfile } from '@/lib/profileService';

export async function clearVaultData() {
  const profiles = await prisma.profile.findMany({ select: { id: true } });
  for (const profile of profiles) {
    const deleted = await permanentlyDeleteProfile(profile.id);
    if (!deleted) throw new Error(`Profile could not be deleted: ${profile.id}`);
  }
  await prisma.$transaction([
    prisma.tag.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.platform.deleteMany({ where: { isCustom: true } }),
  ]);
  return { profiles: profiles.length };
}
