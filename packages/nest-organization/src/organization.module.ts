import { Module } from '@nestjs/common';
import { WebhookEventModule } from '@repo/nest-webhook-event';

import { OrganizationHandler } from './pubsub/organization.handler';

@Module({
  imports: [WebhookEventModule],
  providers: [OrganizationHandler],
})
export class OrganizationModule {}
