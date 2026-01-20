import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import type { FastifyUser } from '@repo/nest-clerk';
import { ClerkAuthGuard, CurrentUser } from '@repo/nest-clerk';
import { HttpService, IRequestResponse, MessageAction, MessageEntity } from '@repo/nest-shared';
import type { UserData } from '@repo/prisma';

import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly httpService: HttpService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(ClerkAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: FastifyUser): Promise<IRequestResponse<UserData>> {
    return this.httpService.createResponse<UserData>(
      HttpStatus.OK,
      MessageAction.FIND_UNIQUE,
      MessageEntity.USER,
      await this.userService.me(user),
    );
  }
}
