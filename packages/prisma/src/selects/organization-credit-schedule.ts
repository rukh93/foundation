import { Prisma } from '../../src';
import { organizationSubscriptionDataSelect } from './organization-subscription';

export const organizationCreditScheduleIdSelect: Prisma.OrganizationCreditScheduleSelect = {
  id: true,
};

export const organizationCreditScheduleData: Prisma.OrganizationCreditScheduleSelect = {
  ...organizationCreditScheduleIdSelect,
  organizationId: true,
  nextSubscriptionGrantAt: true,
  organization: {
    select: {
      subscription: {
        select: organizationSubscriptionDataSelect,
      },
    },
  },
};
