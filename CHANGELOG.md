# Changelog

## 0.3.0

Adds one migration (`20261124000000_saved_filters`, a new empty table). Rolling back to 0.2.0 is safe: the older
version simply ignores the table.

### Added
- **Turkish-aware search.** Case- and accent-insensitive for Turkish and common Latin letters (`ipek` finds `İpek`,
  `yildiz` finds `Yıldız`); several words must all match.
- **Multi-tag filters** (match all or any) and **saved filters** listed in the sidebar. Saved filters are included in
  JSON/ZIP exports and backups.
- **Bulk actions**: select profiles to add/remove tags or collections, favorite, move to Trash; bulk restore and
  permanent delete in Trash.
- **Image previews.** Grid, list and Trash load small WebP previews generated on demand (cached in
  `UPLOADS_DIR/.thumbs`); the lightbox and detail view show the original. Previews are never exported or backed up.
- Chrome extension texts moved to standard `_locales/{en,tr}/messages.json` (extension version 1.2.0).

### Changed
- `getStats` and platform counts are computed in SQL instead of loading every profile.
- `page.tsx` (846 → ~420 lines) and `ProfileModal.tsx` (936 → ~130 lines) split into hooks and sub-components.
- Dependencies: Next.js 14.2.35, i18next/react-i18next, tailwind-merge, autoprefixer, postcss within their ranges;
  `sharp` added for previews. Remaining `npm audit` findings need major upgrades (Next 15/16) and are not applied.
- Firefox now gets slim dark scrollbars like Chromium.

## 0.2.0

No database migrations: upgrading from 0.1.0 and rolling back to it are both safe.

### Fixed
- ZIP export/import now use `UPLOADS_DIR` like the rest of the app (previously `public/uploads`).
- Replace imports save a JSON copy of the current data (`finddex-backup-…-before-import.json`) and, for ZIPs
  with images, a copy of the current uploads (`uploads-before-import-…`) in the backups folder first. A ZIP without
  images no longer wipes existing uploads.
- Remote image downloads reject loopback, private-network and link-local addresses, including via redirects.
  Set `ALLOW_PRIVATE_IMAGE_HOSTS=true` to allow LAN image hosts.
- `GET /api/stats` no longer deletes expired trash. Cleanup is `POST /api/maintenance/trash`, called when the app
  opens and by the nightly scheduler.
- Profile create/update run in a single transaction, so a failure leaves tags, collections, links and activity intact.
- Duplicate-profile reasons are language-neutral codes translated in the UI; remaining Turkish API strings fixed.
- Platform counts are unique, non-trashed profiles.
- The orphan scan no longer treats files referenced only by a profile's avatar/cover as unused.
- Trash is paginated (12 per page, newest deletions first).

### Added
- Working `npm run lint` (ESLint with `next/core-web-vitals`).
- `npm run test:core` covering the fixes above.
- `CHANGELOG.md`.
