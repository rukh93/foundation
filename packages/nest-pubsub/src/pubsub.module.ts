import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';

import config from './pubsub.config';
import { PubSubPushController } from './pubsub.controller';
import { PubSubPushAuthGuard } from './pubsub.guard';
import { PubSubPublisher } from './pubsub.publisher';
import { PubSubRouter } from './pubsub.router';

@Global()
@Module({
  imports: [DiscoveryModule, ConfigModule.forFeature(config)],
  controllers: [PubSubPushController],
  providers: [PubSubRouter, PubSubPushAuthGuard, PubSubPublisher],
  exports: [PubSubPublisher],
})
export class PubSubModule {}
