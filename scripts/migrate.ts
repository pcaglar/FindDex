import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PLATFORMS = [
  {
    key: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: 'from-pink-500 via-rose-500 to-amber-500',
    isCustom: false,
  },
  {
    key: 'twitter',
    name: 'X (Twitter)',
    icon: 'twitter',
    color: 'from-slate-700 to-slate-900',
    isCustom: false,
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    color: 'from-cyan-400 to-pink-500',
    isCustom: false,
  },
  {
    key: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: 'from-red-600 to-red-700',
    isCustom: false,
  },
  {
    key: 'website',
    name: 'Website',
    icon: 'website',
    color: 'from-blue-600 to-indigo-600',
    isCustom: false,
  },
];

async function main() {
  console.log('🔄 Seeding default platforms...');
  const platformMap = new Map<string, string>(); // key -> id

  for (const plat of DEFAULT_PLATFORMS) {
    const record = await prisma.platform.upsert({
      where: { key: plat.key },
      update: {
        name: plat.name,
        icon: plat.icon,
        color: plat.color,
        isCustom: plat.isCustom,
      },
      create: plat,
    });
    platformMap.set(plat.key, record.id);
  }
  console.log(`✅ ${platformMap.size} platforms ready.`);

  const vaultPath = path.join(process.cwd(), 'data', 'vault.json');
  if (!fs.existsSync(vaultPath)) {
    console.log('ℹ️ No data/vault.json found, skipping profile migration.');
    return;
  }

  const raw = fs.readFileSync(vaultPath, 'utf-8');
  const profiles = JSON.parse(raw);
  console.log(`📦 Found ${profiles.length} profiles in data/vault.json. Migrating to SQLite...`);

  for (const p of profiles) {
    // 1. Create or find tags
    const tagIds: string[] = [];
    if (Array.isArray(p.tags)) {
      for (const tagName of p.tags) {
        if (!tagName) continue;
        const tag = await prisma.tag.upsert({
          where: { name: tagName.trim() },
          update: {},
          create: { name: tagName.trim() },
        });
        tagIds.push(tag.id);
      }
    }

    // 2. Create or find collections
    const collectionIds: string[] = [];
    if (Array.isArray(p.collections)) {
      for (const colName of p.collections) {
        if (!colName) continue;
        const col = await prisma.collection.upsert({
          where: { name: colName.trim() },
          update: {},
          create: { name: colName.trim() },
        });
        collectionIds.push(col.id);
      }
    }

    // 3. Upsert profile
    const profile = await prisma.profile.upsert({
      where: { id: p.id },
      update: {
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        bio: p.bio || null,
        notes: p.notes || null,
        isFavorite: Boolean(p.isFavorite),
        isVerified: Boolean(p.isVerified),
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        deletedAt: null,
      },
      create: {
        id: p.id,
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        bio: p.bio || null,
        notes: p.notes || null,
        isFavorite: Boolean(p.isFavorite),
        isVerified: Boolean(p.isVerified),
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        deletedAt: null,
      },
    });

    // 4. Connect tags
    for (const tagId of tagIds) {
      await prisma.profileTag.upsert({
        where: {
          profileId_tagId: {
            profileId: profile.id,
            tagId,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          tagId,
        },
      });
    }

    // 5. Connect collections
    for (const colId of collectionIds) {
      await prisma.profileCollection.upsert({
        where: {
          profileId_collectionId: {
            profileId: profile.id,
            collectionId: colId,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          collectionId: colId,
        },
      });
    }

    // 6. Create platform links
    // First, main platform link
    const primaryPlatformId = platformMap.get(p.platform.toLowerCase()) || platformMap.get('website')!;
    if (p.profileUrl) {
      await prisma.platformLink.create({
        data: {
          profileId: profile.id,
          platformId: primaryPlatformId,
          url: p.profileUrl,
          label: null,
        },
      });
    }

    // Second, if websiteUrl exists and differs from profileUrl
    if (p.websiteUrl && p.websiteUrl.trim() && p.websiteUrl !== p.profileUrl) {
      const websitePlatformId = platformMap.get('website')!;
      await prisma.platformLink.create({
        data: {
          profileId: profile.id,
          platformId: websitePlatformId,
          url: p.websiteUrl.trim(),
          label: 'Website',
        },
      });
    }

    console.log(`  ✓ Migrated: ${p.displayName} (@${p.username})`);
  }

  console.log('🎉 Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
