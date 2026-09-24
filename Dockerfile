FROM node:20-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:/tmp/finddex-build.db
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
    && npx prisma migrate deploy \
    && npm run build

FROM node:20-alpine AS production-dependencies

WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
    && npm install --no-save --omit=dev --package-lock=false prisma@6.19.3 \
    && npx prisma generate

FROM node:20-alpine AS runner

WORKDIR /app
RUN apk add --no-cache openssl su-exec \
    && mkdir -p /app/data/backups /app/public/uploads \
    && chown -R node:node /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:/app/data/dev.db \
    UPLOADS_DIR=/app/public/uploads

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --chown=node:node scripts/docker-prepare-database.mjs ./scripts/docker-prepare-database.mjs
COPY --chown=node:node scripts/backup-scheduler.mjs ./scripts/backup-scheduler.mjs
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
