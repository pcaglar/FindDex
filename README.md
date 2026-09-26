# FindDex

[🇹🇷 Türkçe README](README.tr.md)

Every day, social media introduces us to dozens of people worth remembering: a cook sharing a brilliant recipe, a traveler photographing places we want to visit, or a designer whose work sparks an idea. We like the post and may even follow the account, but weeks later, when we need it again, the username is gone from memory. All we remember is “the person who made that recipe video.” The algorithm never shows the profile again, and it disappears among hundreds of followed accounts.

FindDex turns those passing discoveries into your own searchable memory. Save an interesting profile in seconds, add a note about why it stood out, organize it with meaningful tags and collections, and find it again months later without having to remember the exact username. It is your private, searchable archive of the people and ideas you discover online.

**How it works:** FindDex is a self-hosted, single-user application built with Next.js, Prisma, and SQLite. It stores its database and uploaded images on your own filesystem and runs as one Docker Compose service.

## Features

- Profiles with multiple platform links, tags, collections, notes, and favorites
- Multi-image galleries, cover selection, card navigation, and full-screen lightbox
- Duplicate detection, soft-delete Trash, and profile activity history
- Server-side pagination and an aggregated statistics dashboard
- JSON/ZIP import and export with uploaded images
- Automatic rotating JSON backups
- English and Turkish interface with instant client-side language switching
- Companion Chrome extension for saving Instagram profiles and post thumbnails
- Docker deployment with persistent SQLite and upload storage

## Screenshots

### Main view

![FindDex main card grid](docs/screenshots/main-view.png)

### Profile detail panel

![FindDex profile detail panel](docs/screenshots/detail-panel.png)

### Light and dark themes

![FindDex light and dark theme comparison](docs/screenshots/theme-comparison.png)

## Requirements

- Docker Engine
- Docker Compose v2
- Two writable locations for persistent data and uploaded images

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
```

FindDex is available at `http://localhost:12000` by default. Change `APP_PORT` in `.env` to use another host port.

Useful commands:

```bash
docker compose logs -f app
docker compose down
```

`docker compose down` removes the container and Compose network but keeps persistent data. Do not use `docker compose down -v` unless you intentionally want to delete Docker-managed volumes.

## Storage configuration

FindDex uses two persistent mounts:

| Host location | Container location | Purpose |
| --- | --- | --- |
| `/path/to/finddex-data` | `/app/data` | SQLite database and automatic backups |
| `/path/to/finddex-uploads` | `/app/public/uploads` | Uploaded images |

Replace `/path/to/finddex-data` and `/path/to/finddex-uploads` with permanent locations on your own system. Set the `MODELVAULT_DATA_DIR` and `MODELVAULT_UPLOADS_DIR` values in your `.env` file to those locations:

```dotenv
APP_PORT=12000
MODELVAULT_DATA_DIR=/path/to/finddex-data
MODELVAULT_UPLOADS_DIR=/path/to/finddex-uploads
PUID=1000
PGID=1000
DATABASE_URL=file:./dev.db?connection_limit=1&socket_timeout=30
```

The legacy `MODELVAULT_DATA_DIR` and `MODELVAULT_UPLOADS_DIR` variable names are intentionally preserved so existing installations remain connected to their data after the FindDex rebrand. You may also keep the default `modelvault_data` and `modelvault_uploads` values to use Docker-managed volumes instead of host paths.

Automatic backups are stored under `/app/data/backups`, which is already part of the data mount and does not need a separate volume.

If a Linux or macOS host reports a permission error for bind-mounted directories, make their owner match the `PUID` and `PGID` values from `.env`, for example: `sudo chown -R 1000:1000 /path/to/finddex-data /path/to/finddex-uploads`. Docker Desktop installations generally do not require this step.

## Clean installation

1. Copy `.env.example` to `.env`.
2. Replace the storage paths in `.env` with permanent locations on your system.
3. Create those directories. With a POSIX-compatible shell:

```bash
mkdir -p /path/to/finddex-data /path/to/finddex-uploads
```

4. Start FindDex:

```bash
docker compose up -d --build
docker compose logs -f app
```

On every container start, FindDex prepares SQLite, applies `prisma migrate deploy`, and starts Next.js. A new installation opens with an empty database; demo content can be loaded later from **Settings → Danger Zone**.

## Migrating existing data

Stop FindDex before copying SQLite so the database is not captured during a write. Replace every placeholder path below with the locations configured in your `.env` file:

```bash
docker compose down
mkdir -p /path/to/finddex-data /path/to/finddex-uploads
cp prisma/dev.db /path/to/finddex-data/dev.db
cp -a public/uploads/. /path/to/finddex-uploads/
cp /path/to/finddex-data/dev.db /path/to/finddex-data/dev.db.backup
docker compose up -d --build
```

Use the equivalent file-copy commands provided by your shell if `cp` is unavailable. On hosts that enforce Unix ownership for bind mounts, apply the optional `chown` command from the storage section before starting the container.

FindDex automatically handles both a new empty database and a pre-Docker database without migration history.

## Updating

After pulling or copying a newer version:

```bash
docker compose up -d --build
docker compose logs -f app
```

New Prisma migrations are applied automatically during startup.

## Moving to another machine

Copy all of the following:

1. The project directory, including the source code, `Dockerfile`, and `docker-compose.yml`
2. The complete directory configured as `MODELVAULT_DATA_DIR`
3. The complete directory configured as `MODELVAULT_UPLOADS_DIR`
4. The machine-specific `.env` file

Update the two storage paths in `.env` for the destination machine, verify permissions if necessary, and run `docker compose up -d --build`.

## Chrome extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select `finddex-instagram-extension`.
4. Open the extension settings and choose English or Türkçe.
5. Enter the FindDex server URL and an API key created under **Settings → API Access**.

The extension stores its own language preference in `chrome.storage.local` because extension pages cannot read the web application's localStorage.

## Development without Docker

```bash
npm install
npx prisma migrate dev
npm run dev
```

Copy `.env.example` to `.env` before running local Prisma commands.

## Contributing

1. Create a focused branch.
2. Keep UI strings in `locales/en.json` and `locales/tr.json`; English is the source language.
3. Use `Intl.DateTimeFormat` and `Intl.NumberFormat` for locale-sensitive output.
4. Run `npm run build` and test both languages before submitting changes.
5. Do not rename existing Prisma models or legacy Docker volumes without a migration plan.

## Security

FindDex is designed for a trusted single-user environment and does not include multi-user authentication. If it is reachable from the internet, protect it with a reverse proxy, VPN, or another access-control layer.
