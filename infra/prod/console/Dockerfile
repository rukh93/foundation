# ---------- base ----------
FROM node:24-slim AS base
WORKDIR /repo

# Prisma needs openssl in slim images (both build + runtime)
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# ---------- pruner ----------
FROM base AS pruner
COPY . .

# Scope by package name (best) OR by path. Package name is safer in turborepo.
RUN npx turbo prune --scope=@repo/console-api --docker

# ---------- installer ----------
FROM base AS installer
WORKDIR /app

# Copy pruned manifests + lockfile
COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install deps without running scripts (Prisma postinstall is unsafe in pruned installs)
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---------- builder ----------
FROM base AS builder
WORKDIR /app

# Copy the whole pruned workspace structure that pnpm installed into,
# including per-package node_modules symlinks.
COPY --from=installer /app/ ./

# Overlay the full pruned sources
COPY --from=pruner /repo/out/full/ ./

# Ensure lockfile is present for turbo workspace resolution
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml

# OPTION A (safe): nuke TS incremental caches + stale dist ONLY in workspace code
# Never touch node_modules/.pnpm because it contains Prisma engines "dist"
RUN find /app/apps /app/packages -name "*.tsbuildinfo" -delete 2>/dev/null || true
RUN find /app/apps /app/packages -type d -name "dist" -prune -exec rm -rf {} + 2>/dev/null || true

# Run sequentially to avoid prisma generate/build races
RUN pnpm turbo run prisma:generate --filter=@repo/console-api...
RUN pnpm turbo run build --filter=@repo/console-api...

# ---------- runner ----------
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Prisma runtime needs openssl too
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy the whole built workspace so pnpm symlinks + workspace packages resolve at runtime
COPY --from=builder /app/ ./

EXPOSE 8080
CMD ["node", "apps/console/api/dist/main"]
