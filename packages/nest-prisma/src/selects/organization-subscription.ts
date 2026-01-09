import { Prisma } from '@repo/prisma';

export const organizationSubscriptionIdAndUpdatedAtSelect: Prisma.OrganizationSubscriptionSelect = {
  id: true,
  externalUpdatedAt: true,
};
