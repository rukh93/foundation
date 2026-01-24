import { Module } from '@nestjs/common';

import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { MonthlyGrantHandler } from './pubsub';

@Module({
  controllers: [CreditsController],
  exports: [CreditsService],
  providers: [CreditsService, MonthlyGrantHandler],
})
export class CreditsModule {}
