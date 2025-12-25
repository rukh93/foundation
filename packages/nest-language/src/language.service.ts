import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@repo/nest-prisma';
import { RedisCacheService } from '@repo/nest-redis-cache';
import { ErrorManagerService, MessageAction, MessageEntity } from '@repo/nest-shared';
import type { Language } from '@repo/prisma';

import type { LanguageConfig } from './language.config';

@Injectable()
export class LanguageService {
	constructor(
		private readonly errorManagerService: ErrorManagerService,
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService<LanguageConfig, true>,
		@Inject('REDIS_CACHE_LANGUAGE') private readonly redisCache: RedisCacheService,
	) {}

	async getAll(): Promise<Language[]> {
		const cacheKey: string = 'all_languages';
		const cachedLanguages: Language[] | undefined = await this.redisCache.getGlobal(cacheKey);

		if (cachedLanguages) {
			return cachedLanguages;
		}

		const languages: Language[] = await this.prismaService.language.findMany();

		await this.redisCache.setGlobal(cacheKey, languages, '7 days');

		return languages;
	}

	async findOneByValue(value: string): Promise<Language> {
		const cachedLanguage: Language | undefined = await this.redisCache.getGlobal(value);

		if (cachedLanguage) {
			return cachedLanguage;
		}

		try {
			const language: Language = await this.prismaService.language.findUniqueOrThrow({
				where: {
					value,
				},
			});

			await this.redisCache.setGlobal(value, language, '7 days');

			return language;
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				LanguageService.name,
				MessageAction.FIND_UNIQUE,
				MessageEntity.LANGUAGE,
				{ value },
			);
		}
	}

	async getDefault(): Promise<Language> {
		return await this.findOneByValue(
			this.configService.get<LanguageConfig, 'language.fallback'>('language.fallback', {
				infer: true,
			}),
		);
	}
}
