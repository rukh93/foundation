import { Prisma } from '@repo/prisma';

import { organizationMembershipIdSelect } from '../selects';

export type OrganizationMembershipId = Prisma.OrganizationMembershipGetPayload<{
	select: typeof organizationMembershipIdSelect;
}>;
