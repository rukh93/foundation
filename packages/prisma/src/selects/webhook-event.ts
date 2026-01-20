import { Prisma } from '../../src';

export const webhookEventDataSelect: Prisma.WebhookEventSelect = {
  id: true,
  occurredAt: true,
  provider: true,
  externalEventId: true,
  type: true,
  status: true,
  payload: true,
};
