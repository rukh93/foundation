import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisCacheModule } from '@repo/nest-redis-cache';

import config from './language.config';
import { LanguageController } from './language.controller';
import { LanguageService } from './language.service';

@Global()
@Module({
	controllers: [LanguageController],
	exports: [LanguageService],
	imports: [
		ConfigModule.forFeature(config),
		RedisCacheModule.forFeature('language'),
	],
	providers: [LanguageService],
})
export class LanguageModule {}
