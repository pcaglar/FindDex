import type { Profile } from '@/types/profile';
import { DEMO_PLATFORMS, DEMO_PROFILES } from '../../prisma/seed';

const platformByKey = new Map<string, (typeof DEMO_PLATFORMS)[number]>(DEMO_PLATFORMS.map((platform) => [platform.key, platform]));

// Legacy-compatible view of the canonical dataset in prisma/seed.ts.
export const INITIAL_PROFILES: Profile[] = DEMO_PROFILES.map((profile) => {
  const primary = platformByKey.get(profile.platform)!;
  const website = platformByKey.get('website')!;
  return {
    ...profile,
    platformLinks: [
      { platformId: primary.key, platformKey: primary.key, platformName: primary.name, platformIcon: primary.icon, platformColor: primary.color, url: profile.profileUrl },
      ...(profile.websiteUrl && !(profile.platform === 'website' && profile.websiteUrl === profile.profileUrl)
        ? [{ platformId: website.key, platformKey: website.key, platformName: website.name, platformIcon: website.icon, platformColor: website.color, url: profile.websiteUrl, label: profile.username === 'elenarose' ? 'Portfolio' : undefined }]
        : []),
    ],
  };
});
