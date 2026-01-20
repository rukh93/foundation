import { Module } from '@nestjs/common';

import { CreditsService } from './credits.service';
import { MonthlyGrantHandler } from './pubsub';

@Module({
  exports: [CreditsService],
  providers: [CreditsService, MonthlyGrantHandler],
})
export class CreditsModule {}
