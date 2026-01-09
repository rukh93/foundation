import { Prisma } from '@repo/prisma';

export const webhookEventDataSelect: Prisma.WebhookEventSelect = {
  id: true,
  occurredAt: true,
  provider: true,
  externalEventId: true,
  type: true,
  status: true,
  payload: true,
};
