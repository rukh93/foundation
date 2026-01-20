import { Prisma } from '../../src';
import { organizationIdSelect } from '../selects';

export type OrganizationId = Prisma.OrganizationGetPayload<{
  select: typeof organizationIdSelect;
}>;
