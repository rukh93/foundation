import type { UserWebhookEvent } from '@clerk/fastify';
import { Injectable } from '@nestjs/common';
import type { WebhookMessage } from '@repo/nest-clerk';
import { PrismaService } from '@repo/nest-prisma';
import { IPubSubHandler, PubSubHandler } from '@repo/nest-pubsub';
import { WebhookEventService } from '@repo/nest-webhook-event';
import { $Enums, type $Enums as $EnumsType, Prisma, userIdSelect, WebhookEventData } from '@repo/prisma';

import type { UpsertUserInput } from '../user.types';

@PubSubHandler('WEBHOOK_USER')
@Injectable()
export class UserHandler implements IPubSubHandler<any> {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly webhookEventService: WebhookEventService,
  ) {}

  async handle(message: WebhookMessage) {
    const event: WebhookEventData | null = await this.webhookEventService.findUniqueById(message.eventId);

    if (!event || event.status === $Enums.WebhookProcessStatus.Processed) return;

    const claimed = await this.webhookEventService.markProcessing(event.id);

    if (claimed.count === 0) return;

    const payload = event.payload as unknown as UserWebhookEvent;

    try {
      await this.prismaService.$transaction(async (tx) => {
        if (payload.type === 'user.deleted') {
          await this.applyUserDelete(tx, payload);
        } else {
          await this.applyUserUpsert(tx, payload);
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

  async applyUserDelete(tx: Prisma.TransactionClient, { type, data }: UserWebhookEvent) {
    if (type !== 'user.deleted' || !data.id) return;

    try {
      await tx.user.delete({
        where: { clerkUserId: data.id },
        select: userIdSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return;

      throw error;
    }
  }

  async applyUserUpsert(tx: Prisma.TransactionClient, { type, data }: UserWebhookEvent) {
    if (type !== 'user.created' && type !== 'user.updated') return;

    const primaryEmail =
      data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address ??
      data.email_addresses[0]?.email_address;

    if (!primaryEmail) throw new Error(`Clerk user ${data.id} has no email`);

    const primaryPhone =
      data.phone_numbers.find((p) => p.id === data.primary_phone_number_id)?.phone_number ??
      data.phone_numbers[0]?.phone_number ??
      null;

    let status: $EnumsType.UserStatus = $Enums.UserStatus.Active;

    if (data.banned) {
      status = $Enums.UserStatus.Banned;
    } else if (data.locked) {
      status = $Enums.UserStatus.Locked;
    }

    const userData: UpsertUserInput = {
      clerkUserId: data.id,
      email: primaryEmail,
      status,
      ...(data.first_name ? { firstName: data.first_name } : {}),
      ...(data.last_name ? { lastName: data.last_name } : {}),
      ...(primaryPhone ? { phone: primaryPhone } : {}),
    };

    const { clerkUserId, ...rest } = userData;

    await tx.user.upsert({
      where: { clerkUserId },
      create: userData,
      update: rest,
      select: userIdSelect,
    });
  }
}
