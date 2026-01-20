import type { OrganizationMembershipWebhookEvent } from '@clerk/fastify';
import { Injectable } from '@nestjs/common';
import type { WebhookMessage } from '@repo/nest-clerk';
import { ClerkRoleMapperService } from '@repo/nest-clerk-role-mapper';
import { PrismaService } from '@repo/nest-prisma';
import { PubSubHandler } from '@repo/nest-pubsub';
import { WebhookEventService } from '@repo/nest-webhook-event';
import {
  $Enums,
  type OrganizationId,
  organizationIdSelect,
  organizationMembershipIdSelect,
  Prisma,
  type UserId,
  userIdSelect,
  WebhookEventData,
} from '@repo/prisma';

@PubSubHandler('WEBHOOK_ORGANIZATIONMEMBERSHIP')
@Injectable()
export class OrganizationMembershipHandler {
  constructor(
    private readonly clerkRoleMapperService: ClerkRoleMapperService,
    private readonly prismaService: PrismaService,
    private readonly webhookEventService: WebhookEventService,
  ) {}

  async handle(message: WebhookMessage) {
    const event: WebhookEventData | null = await this.webhookEventService.findUniqueById(message.eventId);

    if (!event || event.status === $Enums.WebhookProcessStatus.Processed) return;

    const claimed = await this.webhookEventService.markProcessing(event.id);

    if (claimed.count === 0) return;

    const payload = event.payload as unknown as OrganizationMembershipWebhookEvent;

    try {
      await this.prismaService.$transaction(async (tx) => {
        if (payload.type === 'organizationMembership.deleted') {
          await this.applyOrganizationMembershipDelete(tx, payload);
        } else {
          await this.applyOrganizationMembershipUpsert(tx, payload);
        }

        await tx.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: $Enums.WebhookProcessStatus.Processed,
            processedAt: new Date(),
            errorMessage: null,
          },
        });
      });
    } catch (error) {
      await this.webhookEventService.markFailed(event.id, String(error).slice(0, 2000));

      throw error;
    }
  }

  async applyOrganizationMembershipDelete(
    tx: Prisma.TransactionClient,
    { type, data }: OrganizationMembershipWebhookEvent,
  ) {
    if (type !== 'organizationMembership.deleted' || !data.id) return;

    try {
      await tx.organizationMembership.delete({
        where: { clerkOrgMemId: data.id },
        select: organizationMembershipIdSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return;

      throw error;
    }
  }

  async applyOrganizationMembershipUpsert(
    tx: Prisma.TransactionClient,
    { type, data }: OrganizationMembershipWebhookEvent,
  ) {
    if (type !== 'organizationMembership.created' && type !== 'organizationMembership.updated') return;

    const organization: OrganizationId = await tx.organization.upsert({
      where: {
        clerkOrgId: data.organization.id,
      },
      create: {
        clerkOrgId: data.organization.id,
        name: data.organization.name,
      },
      update: {
        name: data.organization.name,
      },
      select: organizationIdSelect,
    });

    const user: UserId = await tx.user.upsert({
      where: {
        clerkUserId: data.public_user_data.user_id,
      },
      create: {
        clerkUserId: data.public_user_data.user_id,
        email: data.public_user_data.identifier,
        firstName: data.public_user_data.first_name,
        lastName: data.public_user_data.last_name,
      },
      update: {
        email: data.public_user_data.identifier,
        firstName: data.public_user_data.first_name,
        lastName: data.public_user_data.last_name,
      },
      select: userIdSelect,
    });

    const role = this.clerkRoleMapperService.mapRole(data.role);

    await tx.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      create: {
        organizationId: organization.id,
        userId: user.id,
        clerkOrgMemId: data.id,
        role,
      },
      update: {
        role,
        clerkOrgMemId: data.id,
      },
      select: organizationMembershipIdSelect,
    });
  }
}
