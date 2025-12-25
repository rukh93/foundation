import { Injectable } from '@nestjs/common';
import { LanguageService } from '@repo/nest-language';
import {
  type OrganizationId,
  organizationIdSelect,
  type OrganizationMembershipId,
  organizationMembershipIdSelect,
  PrismaService,
  type UserId,
  userIdSelect,
} from '@repo/nest-prisma';
import { ErrorManagerService, MessageAction, MessageEntity } from '@repo/nest-shared';
import type { Language } from '@repo/prisma';

import type { UpsertOrganizationMembershipInput } from './organization-membership.types';

@Injectable()
export class OrganizationMembershipService {
	constructor(
		private readonly errorManagerService: ErrorManagerService,
		private readonly prismaService: PrismaService,
		private readonly languageService: LanguageService,
	) {}

	async upsert(data: UpsertOrganizationMembershipInput): Promise<OrganizationMembershipId> {
		try {
			const language: Language = await this.languageService.getDefault();

			return await this.prismaService.$transaction(async (tx) => {
				const organization: OrganizationId = await tx.organization.upsert({
					where: {
						clerkOrgId: data.organization.clerkOrgId,
					},
					create: {
						clerkOrgId: data.organization.clerkOrgId,
						name: data.organization.name,
					},
					update: {
						name: data.organization.name,
					},
					select: organizationIdSelect,
				});

				const { clerkUserId, ...restUserData } = data.user;

				const user: UserId = await tx.user.upsert({
					where: {
						clerkUserId,
					},
					create: {
						...data.user,
						languageId: language.id,
					},
					update: restUserData,
					select: userIdSelect,
				});

				return tx.organizationMembership.upsert({
					where: {
						organizationId_userId: {
							organizationId: organization.id,
							userId: user.id,
						},
					},
					create: {
						organizationId: organization.id,
						userId: user.id,
						clerkOrgMemId: data.organizationMembership.clerkOrgMemId,
						role: data.organizationMembership.role,
					},
					update: {
						role: data.organizationMembership.role,
					},
					select: organizationMembershipIdSelect,
				});
			});
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				OrganizationMembershipService.name,
				MessageAction.UPSERT,
				MessageEntity.ORGANIZATION_MEMBERSHIP,
				{ ...data },
			);
		}
	}

	async delete(id: string): Promise<OrganizationMembershipId> {
		try {
			return await this.prismaService.organizationMembership.delete({
				where: {
					clerkOrgMemId: id,
				},
				select: organizationMembershipIdSelect,
			});
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				OrganizationMembershipService.name,
				MessageAction.DELETE,
				MessageEntity.ORGANIZATION_MEMBERSHIP,
				{ clerkOrgMemId: id },
			);
		}
	}
}
