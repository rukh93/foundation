import { verifyWebhook } from '@clerk/fastify/webhooks';
import { Controller, Post, Req } from '@nestjs/common';

import { ClerkService } from './clerk.service';
import type { FastifyRequestWithUser } from './clerk.types';

@Controller('clerk')
export class ClerkController {
	constructor(private readonly clerkService: ClerkService) {}

	@Post('webhooks')
	async webhooks(@Req() req: FastifyRequestWithUser) {
		await this.clerkService.processWebhook(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-argument
			await verifyWebhook(req),
		);
	}
}
