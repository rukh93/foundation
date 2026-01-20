import { Prisma } from '../../src';
import { webhookEventDataSelect } from '../selects';

export type WebhookEventData = Prisma.WebhookEventGetPayload<{
  select: typeof webhookEventDataSelect;
}>;
