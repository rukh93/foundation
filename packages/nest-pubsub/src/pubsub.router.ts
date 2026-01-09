/* eslint-disable
 @typescript-eslint/no-unsafe-assignment,
 @typescript-eslint/no-unsafe-member-access,
 @typescript-eslint/no-unsafe-argument
*/
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { getPubSubHandlerKind } from './pubsub.decorator';
import { IPubSubHandler } from './pubsub.handler';
import type { PubSubHandleContext } from './pubsub.types';

@Injectable()
export class PubSubRouter implements OnModuleInit {
  private readonly logger = new Logger(PubSubRouter.name);
  private readonly handlers = new Map<string, IPubSubHandler>();

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit() {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      const instance = wrapper.instance;

      if (!instance) continue;

      const ctor = instance.constructor;
      const kind = getPubSubHandlerKind(ctor);

      if (!kind) continue;

      if (typeof instance.handle !== 'function') {
        throw new Error(`[PUBSUB]: @PubSubHandler("${kind}") provider ${ctor.name} has no handle() method`);
      }

      if (this.handlers.has(kind)) {
        const prev = this.handlers.get(kind)?.constructor?.name;

        throw new Error(`[PUBSUB]: Duplicate handler for kind="${kind}": ${prev} and ${ctor.name}`);
      }

      this.handlers.set(kind, instance);

      this.logger.log(`[PUBSUB]: Registered handler kind="${kind}" ctor="${ctor.name}"`);
    }
  }

  async handle(message: any, ctx: PubSubHandleContext): Promise<void> {
    const kind = message?.kind;

    if (typeof kind !== 'string') return;

    const handler = this.handlers.get(kind);

    if (!handler) {
      this.logger.warn(`[PUBSUB]: No handler for kind="${kind}" messageId=${ctx.messageId ?? '-'}`);

      return;
    }

    await handler.handle(message, ctx);
  }
}
