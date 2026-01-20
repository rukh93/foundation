import { Prisma } from '../../src';

export const organizationSubscriptionDataSelect: Prisma.OrganizationSubscriptionSelect = {
  id: true,
  externalUpdatedAt: true,
  currentPlanSlug: true,
  currentStatus: true,
  currentPeriodEnd: true,
};
