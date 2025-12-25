import { Module } from '@nestjs/common';
import { ClerkRoleMapperModule } from '@repo/nest-clerk-role-mapper';

import { OrganizationMembershipConsumer } from './organization-membership.consumer';
import { OrganizationMembershipService } from './organization-membership.service';

@Module({
	imports: [ClerkRoleMapperModule],
	exports: [OrganizationMembershipService],
	providers: [OrganizationMembershipService, OrganizationMembershipConsumer],
})
export class OrganizationMembershipModule {}
