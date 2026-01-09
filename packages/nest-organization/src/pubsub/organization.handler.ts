import type { OrganizationWebhookEvent } from '@clerk/fastify';
import { Injectable } from '@nestjs/common';
import type { WebhookMessage } from '@repo/nest-clerk';
import { organizationIdSelect, PrismaService, WebhookEventData } from '@repo/nest-prisma';
import { PubSubHandler } from '@repo/nest-pubsub';
import { WebhookEventService } from '@repo/nest-webhook-event';
import { $Enums, Prisma } from '@repo/prisma';

@PubSubHandler('WEBHOOK_ORGANIZATION')
@Injectable()
export class OrganizationHandler {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly webhookEventService: WebhookEventService,
  ) {}

  async handle(message: WebhookMessage) {
    const event: WebhookEventData | null = await this.webhookEventService.findUniqueById(message.eventId);

    if (!event || event.status === $Enums.WebhookProcessStatus.Processed) return;

    const claimed = await this.webhookEventService.markProcessing(event.id);

    if (claimed.count === 0) return;

    const payload = event.payload as unknown as OrganizationWebhookEvent;

    try {
      await this.prismaService.$transaction(async (tx) => {
        if (payload.type === 'organization.deleted') {
          await this.applyOrganizationDelete(tx, payload);
        } else {
          await this.applyOrganizationUpsert(tx, payload);
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

  async applyOrganizationDelete(tx: Prisma.TransactionClient, { type, data }: OrganizationWebhookEvent) {
    if (type !== 'organization.deleted' || !data.id) return;

    try {
      await tx.organization.delete({
        where: {
          clerkOrgId: data.id,
        },
        select: organizationIdSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return;

      throw error;
    }
  }

  async applyOrganizationUpsert(tx: Prisma.TransactionClient, { type, data }: OrganizationWebhookEvent) {
    if (type !== 'organization.created' && type !== 'organization.updated') return;

    await tx.organization.upsert({
      where: {
        clerkOrgId: data.id,
      },
      create: {
        name: data.name,
        clerkOrgId: data.id,
      },
      update: {
        name: data.name,
      },
      select: organizationIdSelect,
    });
  }
}
