import type { ClerkClient, WebhookEvent } from '@clerk/fastify';
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
import { PubSubPublisher } from '@repo/nest-pubsub';
import { WebhookEventService } from '@repo/nest-webhook-event';
import { $Enums, type $Enums as $EnumsType, Prisma } from '@repo/prisma';

import { CLERK_CLIENT, ErrorCodes } from './clerk.constants';
import type { FastifyUser, WebhookMessage } from './clerk.types';
import { generateKind } from './clerk.utils';

@Injectable()
export class ClerkService {
  constructor(
    @Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient,
    private readonly publisher: PubSubPublisher,
    private readonly prismaService: PrismaService,
    private readonly clerkRoleMapperService: ClerkRoleMapperService,
    private readonly webhookEventService: WebhookEventService,
  ) {}

  async processWebhook(event: WebhookEvent, instanceId: string, timestamp: number): Promise<void> {
    const eventId = `${instanceId}:${event.type}:${timestamp}`;
    const kind = generateKind(event.type);

    try {
      await this.prismaService.webhookEvent.create({
        data: {
          provider: $Enums.WebhookProvider.Clerk,
          externalEventId: eventId,
          type: event.type,
          occurredAt: new Date(timestamp),
          payload: event as unknown as Prisma.InputJsonValue,
        },
      });

      await this.publisher.publish<WebhookMessage>('webhooks', { kind, eventId });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const event = await this.webhookEventService.findUniqueById(eventId);

        if (!event || event.status === $Enums.WebhookProcessStatus.Processed) return;

        await this.publisher.publish<WebhookMessage>('webhooks', { kind, eventId });

        return;
      }

      throw e;
    }
  }

  async ensureUserOrgSync(clerkUserId: string, clerkOrgId: string): Promise<FastifyUser> {
    let user: UserId | null = await this.prismaService.user.findUnique({
      where: { clerkUserId },
      select: userIdSelect,
    });

    if (!user) {
      const clerkUser = await this.clerkClient.users.getUser(clerkUserId);

      user = await this.prismaService.user.create({
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
      org = await this.prismaService.organization.findUnique({
        where: { clerkOrgId: clerkOrgId },
        select: organizationIdSelect,
      });

      if (!org) {
        const clerkOrg = await this.clerkClient.organizations.getOrganization({
          organizationId: clerkOrgId,
        });

        org = await this.prismaService.organization.create({
          data: {
            clerkOrgId: clerkOrg.id,
            name: clerkOrg.name,
          },
          select: organizationIdSelect,
        });
      }

      membership = await this.prismaService.organizationMembership.findUnique({
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
            const role: $EnumsType.OrganizationMembershipRole = this.clerkRoleMapperService.mapRole(
              clerkMembership.role,
            );

            membership = await this.prismaService.organizationMembership.create({
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
  }
}
