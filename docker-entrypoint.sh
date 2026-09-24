#!/bin/sh
set -eu

if [ "$(id -u)" = "0" ]; then
  PUID="${PUID:-1000}"
  PGID="${PGID:-1000}"

  case "$PUID:$PGID" in
    *[!0-9:]*|:*|*:)
      echo "PUID and PGID must be numeric values." >&2
      exit 1
      ;;
  esac

  mkdir -p /app/data/backups /app/public/uploads
  chown -R "$PUID:$PGID" /app/data /app/public/uploads

  exec su-exec "$PUID:$PGID" sh /app/docker-entrypoint.sh
fi

mkdir -p /app/data/backups /app/public/uploads

# Baseline a database copied from the pre-Docker installation, then apply any
# migrations that have not run yet. A new, empty database skips baselining.
node /app/scripts/docker-prepare-database.mjs
./node_modules/.bin/prisma migrate deploy

node /app/scripts/backup-scheduler.mjs &

exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000
