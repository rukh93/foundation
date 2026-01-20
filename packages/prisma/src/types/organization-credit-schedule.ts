import { Prisma } from '../../src';
import { organizationCreditScheduleData, organizationCreditScheduleIdSelect } from '../selects';

export type OrganizationCreditScheduleId = Prisma.OrganizationCreditScheduleGetPayload<{
  select: typeof organizationCreditScheduleIdSelect;
}>;

export type OrganizationCreditScheduleData = Prisma.OrganizationCreditScheduleGetPayload<{
  select: typeof organizationCreditScheduleData;
}>;
