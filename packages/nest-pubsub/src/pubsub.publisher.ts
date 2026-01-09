import { PubSub } from '@google-cloud/pubsub';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import pubSubConfig from './pubsub.config';

@Injectable()
export class PubSubPublisher {
  private readonly pubsub: PubSub;

  constructor(
    @Inject(pubSubConfig.KEY)
    private readonly config: ConfigType<typeof pubSubConfig>,
  ) {
    this.pubsub = new PubSub({ projectId: this.config.projectId });
  }

  async publish<T = object>(topic: string, message: T, attributes?: Record<string, string>) {
    const topicName = this.config.topics[topic] as string | undefined;

    if (!topicName) {
      throw new Error(`[PUBSUB]: Topic "${topic}" is missing`);
    }

    const data = Buffer.from(JSON.stringify(message), 'utf8');

    return this.pubsub.topic(topicName).publishMessage({ data, attributes });
  }
}
