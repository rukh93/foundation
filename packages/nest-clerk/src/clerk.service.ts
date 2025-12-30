import type { ClerkClient, WebhookEvent } from '@clerk/fastify';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ForbiddenException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClerkRoleMapperService } from '@repo/nest-clerk-role-mapper';
import {
  type OrganizationId,
  organizationIdSelect,
  type OrganizationMembershipId,
  organizationMembershipIdSelect,
  PrismaService,
  type UserId,
  userIdSelect,
} from '@repo/nest-prisma';
import type { OrganizationMembershipRole } from '@repo/prisma';

import { CLERK_CLIENT, ErrorCodes } from './clerk.constants';
import type { FastifyUser } from './clerk.types';

@Injectable()
export class ClerkService {
  constructor(
    @Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient,
    private readonly amqp: AmqpConnection,
    private readonly prismaService: PrismaService,
    private readonly clerkRoleMapperService: ClerkRoleMapperService,
  ) {}

  async processWebhook(event: WebhookEvent): Promise<void> {
    await this.amqp.publish('entity.events', event.type, event);
  }

  async ensureUserOrgSync(clerkUserId: string, clerkOrgId: string): Promise<FastifyUser> {
    return this.prismaService.$transaction(async (tx) => {
      let user: UserId | null = await tx.user.findUnique({
        where: { clerkUserId },
        select: userIdSelect,
      });

      if (!user) {
        const clerkUser = await this.clerkClient.users.getUser(clerkUserId);

        user = await tx.user.create({
          data: {
            clerkUserId,
            email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
          },
          select: userIdSelect,
        });
      }

      let org: OrganizationId | null = null;
      let membership: OrganizationMembershipId | null = null;

      if (clerkOrgId) {
        org = await tx.organization.findUnique({
          where: { clerkOrgId: clerkOrgId },
          select: organizationIdSelect,
        });

        if (!org) {
          const clerkOrg = await this.clerkClient.organizations.getOrganization({
            organizationId: clerkOrgId,
          });

          org = await tx.organization.create({
            data: {
              clerkOrgId: clerkOrg.id,
              name: clerkOrg.name,
            },
            select: organizationIdSelect,
          });
        }

        membership = await tx.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: user.id,
            },
          },
          select: organizationMembershipIdSelect,
        });

        if (!membership) {
          const { totalCount, data } = await this.clerkClient.organizations.getOrganizationMembershipList({
            userId: [clerkUserId],
            organizationId: clerkOrgId,
          });

          if (totalCount === 0) {
            throw new ForbiddenException(ErrorCodes.USER_NOT_MEMBER_OF_CURRENT_ORGANIZATION);
          }

          if (totalCount > 0) {
            const [clerkMembership] = data;

            if (clerkMembership) {
              const role: OrganizationMembershipRole = this.clerkRoleMapperService.mapRole(clerkMembership.role);

              membership = await tx.organizationMembership.create({
                data: {
                  organizationId: org.id,
                  userId: user.id,
                  clerkOrgMemId: clerkMembership.id,
                  role,
                },
                select: organizationMembershipIdSelect,
              });
            }
          }
        }
      }

      if (!org || !membership) {
        throw new InternalServerErrorException(ErrorCodes.FAILED_SYNC_ORGANIZATION_MEMBERSHIP);
      }

      return {
        clerkUserId,
        clerkOrgId,
        userId: user.id,
        orgId: org.id,
        orgMemId: membership.id,
      };
    });
  }
}
