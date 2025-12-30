import { Module } from '@nestjs/common';

import { ClerkRoleMapperService } from './clerk-role-mapper.service';

@Module({
  exports: [ClerkRoleMapperService],
  providers: [ClerkRoleMapperService],
})
export class ClerkRoleMapperModule {}
