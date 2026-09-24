export interface PlatformItem {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  isCustom: boolean;
  count?: number;
}

export interface PlatformLinkItem {
  id?: string;
  platformId: string;
  platformKey: string;
  platformName: string;
  platformIcon: string;
  platformColor: string;
  url: string;
  label?: string | null;
}

export interface ProfileImageItem {
  id?: string;
  url: string;
  isCover: boolean;
  sortOrder: number;
  createdAt?: string;
}

export type ActivityAction =
  | 'NOTE_UPDATED' | 'TAG_ADDED' | 'TAG_REMOVED'
  | 'COLLECTION_ADDED' | 'COLLECTION_REMOVED'
  | 'FAVORITED' | 'UNFAVORITED' | 'EDITED' | 'CREATED'
  | 'RESTORED_FROM_TRASH';

export interface ActivityLogItem {
  id: string;
  profileId: string;
  action: ActivityAction;
  detail: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  username: string; // @handle
  displayName: string; // Real name
  avatarUrl: string; // Profile / cover image
  coverUrl?: string | null;
  bio?: string | null;
  notes?: string | null;
  isFavorite: boolean;
  isVerified: boolean;
  deletedAt?: string | null; // Soft delete
  createdAt: string;
  updatedAt: string;

  // Multiple platform links, tags, and collections
  platformLinks: PlatformLinkItem[];
  images?: ProfileImageItem[];
  tags: string[];
  collections: string[];

  // Backward-compatibility fields
  platform?: string;
  profileUrl?: string;
  websiteUrl?: string;
}

export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'favorites';

export type FilterPlatform =
  | 'all'
  | 'instagram'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'website'
  | 'favorites'
  | 'hasWebsite'
  | string;
