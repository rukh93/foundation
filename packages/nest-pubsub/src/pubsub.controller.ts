import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import { PubSubPushAuthGuard } from './pubsub.guard';
import { PubSubRouter } from './pubsub.router';
import type { PubSubPushEnvelope } from './pubsub.types';
import { decodePubSubMessageData } from './pubsub.utils';

@Controller('pubsub')
export class PubSubPushController {
  constructor(private readonly router: PubSubRouter) {}

  @Post('push')
  @HttpCode(204)
  @UseGuards(PubSubPushAuthGuard)
  async handlePush(@Body() body: PubSubPushEnvelope): Promise<void> {
    const messageId = body?.message?.messageId;
    const attributes = body?.message?.attributes;

    await this.router.handle(decodePubSubMessageData(body), { messageId, attributes });
  }
}
