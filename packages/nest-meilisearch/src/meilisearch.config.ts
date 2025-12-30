import { registerAs } from '@nestjs/config';
import type { Config } from 'meilisearch';

export type MeiliSearchConfig = {
  meilisearch: Config;
};

export default registerAs('meilisearch', () => ({
  host: 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_MASTER_KEY!,
}));
