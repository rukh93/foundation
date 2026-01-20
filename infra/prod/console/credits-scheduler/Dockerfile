# ---------- base ----------
FROM node:24-slim AS base
WORKDIR /repo

RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---------- pruner ----------
FROM base AS pruner
WORKDIR /repo

RUN corepack enable
RUN corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

COPY apps ./apps
COPY packages ./packages

RUN pnpm dlx turbo prune --scope=@repo/credits-scheduler --docker

# ---------- installer ----------
FROM base AS installer
WORKDIR /repo

RUN corepack enable
RUN corepack prepare pnpm@10.28.0 --activate

COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /repo/out/full/ ./

RUN pnpm -C apps/console/credits-scheduler build

# ---------- runner ----------
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=installer /repo/apps/credits-scheduler/dist ./dist
COPY --from=installer /repo/apps/credits-scheduler/package.json ./package.json
COPY --from=installer /repo/node_modules ./node_modules

CMD ["node", "dist/index.js"]
