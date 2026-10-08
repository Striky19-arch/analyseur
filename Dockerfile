# syntax=docker/dockerfile:1
# Image multi-étapes (cdc.md §17) : build Next.js `output: 'standalone'` puis
# runtime minimal. `better-sqlite3` fournit ses prebuilds dans le paquet npm
# (linux-x64 inclus) : aucune compilation native n'est nécessaire.

# --- 1. Dépendances -----------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- 2. Build (sortie standalone) ---------------------------------------------
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- 3. Runtime ---------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/app/data/app.db \
    UPLOAD_DIR=/app/uploads
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /app/data /app/uploads \
    && chown nextjs:nodejs /app/data /app/uploads
# Serveur standalone + assets statiques + migrations Drizzle (lues au runtime
# par `migrateOnce()` — hors file-tracing, donc copiées explicitement).
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
USER nextjs
EXPOSE 3000
VOLUME ["/app/data", "/app/uploads"]
CMD ["node", "server.js"]
