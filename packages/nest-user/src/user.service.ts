import { Injectable } from '@nestjs/common';
import type { FastifyUser } from '@repo/nest-clerk';
import { PrismaService, type UserData, userDataSelect } from '@repo/nest-prisma';
import { ErrorManagerService, MessageAction, MessageEntity } from '@repo/nest-shared';

@Injectable()
export class UserService {
  constructor(
    private readonly errorManagerService: ErrorManagerService,
    private readonly prismaService: PrismaService,
  ) {}

  async me(user: FastifyUser): Promise<UserData> {
    try {
      return await this.prismaService.user.findUniqueOrThrow({
        where: {
          id: user.userId,
        },
        select: userDataSelect,
      });
    } catch (error) {
      this.errorManagerService.logErrorAndThrow(
        error,
        UserService.name,
        MessageAction.FIND_UNIQUE,
        MessageEntity.USER,
        { ...user },
      );
    }
  }
}
