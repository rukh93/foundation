import { Module } from '@nestjs/common';
import { WebhookEventModule } from '@repo/nest-webhook-event';

import { ClerkBillingService } from './clerk-billing.service';
import { SubscriptionHandler } from './pubsub';

@Module({
  imports: [WebhookEventModule],
  providers: [ClerkBillingService, SubscriptionHandler],
  exports: [ClerkBillingService],
})
export class ClerkBillingModule {}
