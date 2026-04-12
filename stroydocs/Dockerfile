# Build: 2026-04-12-fix-prisma-engines
# ── Stage 1: Production dependencies (только runtime-зависимости) ─────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY .npmrc ./
COPY prisma ./prisma/
RUN npm config set registry https://registry.npmjs.org \
    && npm config set fetch-timeout 300000 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retries 5 \
    && PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --omit=dev --no-audit

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl git
WORKDIR /app

# Полная установка (включая devDeps нужных для сборки: typescript, prisma CLI и т.д.)
COPY package.json package-lock.json ./
COPY .npmrc ./
COPY prisma ./prisma/
RUN npm config set registry https://registry.npmjs.org \
    && npm config set fetch-timeout 300000 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retries 5 \
    && PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --no-audit

# Копируем исходники
COPY . .
# Копируем WASM-файл web-ifc в public/ — postinstall выполнялся до COPY . ., поэтому public/ не существовала
RUN cp node_modules/web-ifc/web-ifc.wasm public/ 2>/dev/null || true
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time defaults — переопределяются через переменные окружения в runtime
ARG DATABASE_URL="postgresql://placeholder:5432/placeholder"
ARG NEXTAUTH_SECRET="build-placeholder"
ARG NEXTAUTH_URL="http://localhost:3000"
ENV DATABASE_URL=$DATABASE_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL

# npm run build = prisma generate + next build
RUN npm run build
# Компилируем воркеры в CommonJS для запуска в production без ts-node
RUN npm run build:workers

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libreoffice
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Prod-зависимости из stage deps (без devDeps: typescript, eslint, vitest и т.д.)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Собранное приложение
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/templates ./templates
# Скомпилированные BullMQ-воркеры (parse-ifc и зависимости)
COPY --from=builder /app/dist/workers ./dist/workers
COPY scripts/start.sh ./start.sh
COPY scripts/check-migration-integrity.js ./scripts/check-migration-integrity.js
COPY scripts/find-failed-migration.js ./scripts/find-failed-migration.js

RUN sed -i 's/\r//' /app/start.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "/app/start.sh"]
