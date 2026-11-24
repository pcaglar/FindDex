// Legacy database names: existing installations store these exact values, so they
// must not change without a migration. UI labels come from sidebar.favorites and
// sidebar.watchLater in the locale files, never from these constants.
export const FAVORITES_COLLECTION = 'Favoriler';
export const WATCH_LATER_COLLECTION = 'Sonra Bak';
export const SYSTEM_COLLECTION_NAMES = [FAVORITES_COLLECTION, WATCH_LATER_COLLECTION] as const;

// Older data and imports may use these spellings of the watch-later collection.
export const WATCH_LATER_ALIASES = [WATCH_LATER_COLLECTION, 'sonra bak', 'Watch Later'];

const normalize = (name: string) => name.trim().toLocaleLowerCase('tr-TR');

// Only the two stored system names are protected from rename/delete.
export function isSystemCollection(name: string) {
  return SYSTEM_COLLECTION_NAMES.some((systemName) => normalize(systemName) === normalize(name));
}

export function isFavoritesCollection(name: string) {
  return [FAVORITES_COLLECTION, 'Favorites'].some((alias) => normalize(alias) === normalize(name));
}

export function isWatchLaterCollection(name: string) {
  return WATCH_LATER_ALIASES.some((alias) => normalize(alias) === normalize(name));
}

// Returns the locale key for a system collection label, or null for user collections.
export function systemCollectionLabelKey(name: string) {
  if (isFavoritesCollection(name)) return 'sidebar.favorites';
  if (isWatchLaterCollection(name)) return 'sidebar.watchLater';
  return null;
}
