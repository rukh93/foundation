import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import config from './openai.config';
import { OPENAI_CLIENT } from './openai.constants';
import { OpenAiService } from './openai.service';

@Module({
	imports: [ConfigModule.forFeature(config)],
	providers: [
		{
			provide: OPENAI_CLIENT,
			useFactory: (configService: ConfigService) => {
				const apiKey = configService.getOrThrow<string>('apiKey');
				return new OpenAI({ apiKey });
			},
			inject: [ConfigService],
		},
		OpenAiService,
	],
	exports: [OPENAI_CLIENT, OpenAiService],
})
export class AiModule {}
