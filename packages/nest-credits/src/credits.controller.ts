import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import type { FastifyUser } from '@repo/nest-clerk';
import { ClerkAuthGuard, CurrentUser } from '@repo/nest-clerk';
import { HttpService, MessageAction, MessageEntity } from '@repo/nest-shared';

import { CreditsService } from './credits.service';

@Controller('credits')
export class CreditsController {
  constructor(
    private readonly creditsService: CreditsService,
    private readonly httpService: HttpService,
  ) {}

  @UseGuards(ClerkAuthGuard)
  @Post('apply')
  async charge(@CurrentUser() user: FastifyUser, @Body() body: { delta: number; featureKey: string; }) {
    return this.httpService.createResponse(
      HttpStatus.OK,
      MessageAction.FIND_MANY,
      MessageEntity.CREDITS,
      await this.creditsService.apply(user, body.delta, body.featureKey),
    );
  }
}
