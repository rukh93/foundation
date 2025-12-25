import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { type Config, MeiliSearch } from 'meilisearch';

import config, { type MeiliSearchConfig } from './meilisearch.config';
import { MEILISEARCH_CLIENT } from './meilisearch.constants';
import { MeiliSearchService } from './meilisearch.service';

@Global()
@Module({
	imports: [ConfigModule.forFeature(config)],
})
export class MeiliSearchModule {
	static forRoot(): DynamicModule {
		return {
			module: MeiliSearchModule,
			providers: [
				{
					provide: MEILISEARCH_CLIENT,
					useFactory: (configService: ConfigService<MeiliSearchConfig, true>) =>
						new MeiliSearch(configService.get<Config>('meilisearch')),
					inject: [ConfigService],
				},
				MeiliSearchService,
			],
			exports: [MeiliSearchService],
		};
	}
}
