import type { UpsertOrganizationInput } from '@repo/nest-organization';
import type { UpsertUserInput } from '@repo/nest-user';
import type { OrganizationMembershipRole } from '@repo/prisma';

export type UpsertOrganizationMembershipInput = {
  organizationMembership: {
    clerkOrgMemId: string;
    role: OrganizationMembershipRole;
  };
  organization: UpsertOrganizationInput;
  user: UpsertUserInput;
};
