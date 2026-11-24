// Client-safe bulk action names (shared by the action bar, the API route and the service).
export type BulkAction =
  | 'favorite' | 'unfavorite'
  | 'addTags' | 'removeTags'
  | 'addCollections' | 'removeCollections'
  | 'trash';

export const BULK_ACTIONS: BulkAction[] = ['favorite', 'unfavorite', 'addTags', 'removeTags', 'addCollections', 'removeCollections', 'trash'];
