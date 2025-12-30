import { Controller, Get, HttpStatus } from '@nestjs/common';
import { HttpService, MessageAction, MessageEntity } from '@repo/nest-shared';
import type { Language } from '@repo/prisma';

import { LanguageService } from './language.service';

@Controller('language')
export class LanguageController {
  constructor(
    private readonly languageService: LanguageService,
    private readonly httpService: HttpService,
  ) {}

  @Get('all')
  async allLanguages() {
    return this.httpService.createResponse<Language[]>(
      HttpStatus.OK,
      MessageAction.FIND_MANY,
      MessageEntity.LANGUAGE,
      await this.languageService.getAll(),
    );
  }
}
