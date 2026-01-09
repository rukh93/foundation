import { Prisma } from '@repo/prisma';

import { webhookEventDataSelect } from '../selects';

export type WebhookEventData = Prisma.WebhookEventGetPayload<{
  select: typeof webhookEventDataSelect;
}>;
