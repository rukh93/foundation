import { Module } from '@nestjs/common';
import { ClerkRoleMapperModule } from '@repo/nest-clerk-role-mapper';
import { WebhookEventModule } from '@repo/nest-webhook-event';

import { OrganizationMembershipHandler } from './pubsub/organization-membership.handler';

@Module({
  imports: [ClerkRoleMapperModule, WebhookEventModule],
  providers: [OrganizationMembershipHandler],
})
export class OrganizationMembershipModule {}
