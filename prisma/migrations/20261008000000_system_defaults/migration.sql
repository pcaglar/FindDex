-- Add missing defaults without changing existing IDs, metadata or relations.
INSERT OR IGNORE INTO "Platform" ("id", "key", "name", "icon", "color", "isCustom") VALUES
  ('system_platform_instagram', 'instagram', 'Instagram', 'instagram', 'from-pink-500 via-rose-500 to-amber-500', false),
  ('system_platform_twitter', 'twitter', 'X (Twitter)', 'twitter', 'from-slate-700 to-slate-900', false),
  ('system_platform_tiktok', 'tiktok', 'TikTok', 'tiktok', 'from-cyan-400 to-pink-500', false),
  ('system_platform_youtube', 'youtube', 'YouTube', 'youtube', 'from-red-600 to-red-700', false),
  ('system_platform_website', 'website', 'Website', 'website', 'from-blue-600 to-indigo-600', false);

-- Legacy storage names are translated to Favorites / Watch Later in the UI.
INSERT OR IGNORE INTO "Collection" ("id", "name") VALUES
  ('system_collection_favorites', 'Favoriler'),
  ('system_collection_watch_later', 'Sonra Bak');
