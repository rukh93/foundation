import { Injectable } from '@nestjs/common';
import {
	OrganizationMembershipRole,
	type OrganizationMembershipRole as OrganizationMembershipRoleType,
} from '@repo/prisma';

@Injectable()
export class ClerkRoleMapperService {
	mapRole(role: string): OrganizationMembershipRoleType {
		switch (role) {
			case 'org:admin':
				return OrganizationMembershipRole.Admin;
			case 'org:member':
			default:
				return OrganizationMembershipRole.Member;
		}
	}
}
