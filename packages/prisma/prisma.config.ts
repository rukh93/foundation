import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import dotenv from 'dotenv';
import type { PrismaConfig } from 'prisma';
import { defineConfig } from 'prisma/config';

const rootEnvPath = resolve(__dirname, '../../.env');

if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
}) satisfies PrismaConfig;
