# Changelog

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
