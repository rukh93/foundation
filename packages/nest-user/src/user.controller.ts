import { Controller, Get, HttpStatus,UseGuards } from '@nestjs/common';
import type { FastifyUser } from '@repo/nest-clerk';
import { ClerkAuthGuard, CurrentUser } from '@repo/nest-clerk';
import { UserData } from '@repo/nest-prisma';
import { HttpService,MessageAction, MessageEntity } from '@repo/nest-shared';

import { UserService } from './user.service';

@Controller('user')
export class UserController {
	constructor(
    private readonly httpService: HttpService,
    private readonly userService: UserService
  ) {}

  @UseGuards(ClerkAuthGuard)
	@Get('me')
	async me(@CurrentUser() user: FastifyUser) {
    return this.httpService.createResponse<UserData>(
      HttpStatus.OK,
      MessageAction.FIND_UNIQUE,
      MessageEntity.USER,
      await this.userService.me(user)
    );
	}
}
