import { Prisma } from '../../src';
import { organizationSubscriptionDataSelect } from '../selects';

export type OrganizationSubscriptionData = Prisma.OrganizationSubscriptionGetPayload<{
  select: typeof organizationSubscriptionDataSelect;
}>;
