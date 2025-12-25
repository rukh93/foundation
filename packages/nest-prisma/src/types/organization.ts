import { Prisma } from '@repo/prisma';

import { organizationIdSelect } from '../selects';

export type OrganizationId = Prisma.OrganizationGetPayload<{
	select: typeof organizationIdSelect;
}>;
