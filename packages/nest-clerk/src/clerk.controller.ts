import { verifyWebhook } from '@clerk/fastify/webhooks';
import { Body, Controller, Post, Req } from '@nestjs/common';

import { ClerkService } from './clerk.service';
import type { FastifyRequestWithUser, WebhookBody } from './clerk.types';

@Controller('clerk')
export class ClerkController {
  constructor(private readonly clerkService: ClerkService) {}

  @Post('webhooks')
  async webhooks(@Req() req: FastifyRequestWithUser, @Body() body: WebhookBody) {
    await this.clerkService.processWebhook(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-argument
      await verifyWebhook(req),
      body.instance_id,
      body.timestamp,
    );
  }
}
