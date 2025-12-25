import { Injectable } from '@nestjs/common';
import type { FastifyUser } from '@repo/nest-clerk';
import { LanguageService } from '@repo/nest-language';
import { PrismaService, type UserData, userDataSelect, type UserId, userIdSelect } from '@repo/nest-prisma';
import { ErrorManagerService, MessageAction, MessageEntity } from '@repo/nest-shared';

import type { UpsertUserInput } from './user.types';

@Injectable()
export class UserService {
	constructor(
		private readonly errorManagerService: ErrorManagerService,
		private readonly prismaService: PrismaService,
		private readonly languageService: LanguageService,
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
        { ...user }
      );
    }
  }

	async upsert(data: UpsertUserInput): Promise<UserId> {
		const language = await this.languageService.getDefault();

		try {
			const { clerkUserId, ...rest } = data;

			return await this.prismaService.user.upsert({
				where: {
					clerkUserId,
				},
				create: {
					...data,
					languageId: language.id,
				},
				update: rest,
				select: userIdSelect,
			});
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				UserService.name,
				MessageAction.UPSERT,
				MessageEntity.USER,
				{ clerkUserId: data.clerkUserId }
			);
		}
	}

	async delete(id: string): Promise<UserId> {
		try {
			return await this.prismaService.user.delete({
				where: {
					clerkUserId: id,
				},
				select: userIdSelect,
			});
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				UserService.name,
				MessageAction.DELETE,
				MessageEntity.USER,
				{ clerkUserId: id }
			);
		}
	}
}
