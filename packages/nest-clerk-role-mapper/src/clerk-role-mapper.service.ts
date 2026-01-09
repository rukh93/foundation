import { Injectable } from '@nestjs/common';
import { $Enums, type $Enums as $EnumsType } from '@repo/prisma';

@Injectable()
export class ClerkRoleMapperService {
  mapRole(role: string): $EnumsType.OrganizationMembershipRole {
    switch (role) {
      case 'org:admin':
        return $Enums.OrganizationMembershipRole.Admin;
      case 'org:member':
      default:
        return $Enums.OrganizationMembershipRole.Member;
    }
  }
}
