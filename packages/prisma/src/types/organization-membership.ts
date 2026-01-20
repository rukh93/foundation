import { Prisma } from '../../src';
import { organizationMembershipIdSelect } from '../selects';

export type OrganizationMembershipId = Prisma.OrganizationMembershipGetPayload<{
  select: typeof organizationMembershipIdSelect;
}>;
