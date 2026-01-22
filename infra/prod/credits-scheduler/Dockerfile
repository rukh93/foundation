# ---------- base ----------
FROM node:24-slim AS base
WORKDIR /repo

# Prisma needs openssl in slim images (both build + runtime)
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# ---------- pruner ----------
FROM base AS pruner
COPY . .

# Prune only what credits-scheduler needs
RUN npx turbo prune --scope=@repo/credits-scheduler --docker

# ---------- installer ----------
FROM base AS installer
WORKDIR /app

# Copy pruned manifests + lockfile
COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install deps without running scripts (Prisma postinstall unsafe in pruned installs)
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---------- builder ----------
FROM base AS builder
WORKDIR /app

# Copy installed workspace structure (node_modules symlinks etc.)
COPY --from=installer /app/ ./

# Overlay full pruned sources
COPY --from=pruner /repo/out/full/ ./

# Ensure lockfile is present
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Clean caches (optional but consistent with your other Dockerfile)
RUN find /app/apps /app/packages -name "*.tsbuildinfo" -delete 2>/dev/null || true
RUN find /app/apps /app/packages -type d -name "dist" -prune -exec rm -rf {} + 2>/dev/null || true

# Prisma client generation (dummy DB url)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
RUN pnpm --filter @repo/prisma prisma:generate

# Build only scheduler
RUN pnpm turbo run build --filter=@repo/credits-scheduler...

# ---------- runner ----------
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy the built workspace so workspace deps resolve at runtime
COPY --from=builder /app/ ./

# Adjust this path if your scheduler entry differs
CMD ["node", "apps/credits-scheduler/dist/index.js"]
