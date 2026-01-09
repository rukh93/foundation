import { Prisma } from '@repo/prisma';

import { organizationSubscriptionIdAndUpdatedAtSelect } from '../selects';

export type OrganizationSubscriptionIdAndUpdatedAt = Prisma.OrganizationSubscriptionGetPayload<{
  select: typeof organizationSubscriptionIdAndUpdatedAtSelect;
}>;
