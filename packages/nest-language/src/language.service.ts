import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PrismaService } from '@repo/nest-prisma';
import { ErrorManagerService, MessageAction, MessageEntity } from '@repo/nest-shared';
import type { Language } from '@repo/prisma';

import languageConfig from './language.config';

@Injectable()
export class LanguageService {
  constructor(
    private readonly errorManagerService: ErrorManagerService,
    private readonly prismaService: PrismaService,
    @Inject(languageConfig.KEY)
    private readonly config: ConfigType<typeof languageConfig>,
  ) {}

  async getAll(): Promise<Language[]> {
    return this.prismaService.language.findMany();
  }

  async findOneByValue(value: string): Promise<Language> {
    try {
      return await this.prismaService.language.findUniqueOrThrow({
        where: {
          value,
        },
      });
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
    return await this.findOneByValue(this.config.fallback);
  }
}
