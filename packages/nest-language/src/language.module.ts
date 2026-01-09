import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import config from './language.config';
import { LanguageController } from './language.controller';
import { LanguageService } from './language.service';

@Global()
@Module({
  controllers: [LanguageController],
  exports: [LanguageService],
  imports: [ConfigModule.forFeature(config)],
  providers: [LanguageService],
})
export class LanguageModule {}
