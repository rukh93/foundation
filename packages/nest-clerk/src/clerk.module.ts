import { clerkClient } from '@clerk/fastify';
import { Global, Module } from '@nestjs/common';
import { ClerkRoleMapperModule } from '@repo/nest-clerk-role-mapper';

import { CLERK_CLIENT } from './clerk.constants';
import { ClerkController } from './clerk.controller';
import { ClerkService } from './clerk.service';

@Global()
@Module({
  controllers: [ClerkController],
  providers: [
    {
      provide: CLERK_CLIENT,
      useValue: clerkClient,
    },
    ClerkService,
  ],
  imports: [ClerkRoleMapperModule],
  exports: [CLERK_CLIENT, ClerkService],
})
export class ClerkModule {}
