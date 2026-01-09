import { Module } from '@nestjs/common';
import { LanguageModule } from '@repo/nest-language';
import { WebhookEventModule } from '@repo/nest-webhook-event';

import { UserHandler } from './pubsub/user.handler';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [LanguageModule, WebhookEventModule],
  controllers: [UserController],
  exports: [UserService],
  providers: [UserService, UserHandler],
})
export class UserModule {}
