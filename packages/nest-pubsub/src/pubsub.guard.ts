import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { OAuth2Client } from 'google-auth-library';

import pubSubConfig from './pubsub.config';

@Injectable()
export class PubSubPushAuthGuard implements CanActivate {
  private readonly client = new OAuth2Client();

  constructor(
    @Inject(pubSubConfig.KEY)
    private readonly config: ConfigType<typeof pubSubConfig>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.config.emulator.enabled) return true;

    const req = ctx.switchToHttp().getRequest<FastifyRequest>();

    if (!this.config.pushAudience || !this.config.pushServiceAccountEmail) {
      throw new UnauthorizedException('[PUBSUB]: Missing PUBSUB_PUSH_AUDIENCE or PUBSUB_PUSH_SA_EMAIL env vars');
    }

    const authHeader = req.headers?.authorization || req.headers?.Authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('[PUBSUB]: Missing authorization header');
    }

    const m = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!m || !m[1]) {
      throw new UnauthorizedException('[PUBSUB]: Invalid authorization header');
    }

    const ticket = await this.client.verifyIdToken({ idToken: m[1], audience: this.config.pushAudience });

    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      throw new UnauthorizedException('[PUBSUB]: Token has no email');
    }

    if (email !== this.config.pushServiceAccountEmail) {
      throw new UnauthorizedException(`[PUBSUB]: Unexpected push SA: ${email}`);
    }

    return true;
  }
}
