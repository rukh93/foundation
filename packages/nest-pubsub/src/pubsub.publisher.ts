import { PubSub } from '@google-cloud/pubsub';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import pubSubConfig from './pubsub.config';

@Injectable()
export class PubSubPublisher implements OnModuleInit {
  private readonly pubsub: PubSub;

  constructor(
    @Inject(pubSubConfig.KEY)
    private readonly config: ConfigType<typeof pubSubConfig>,
  ) {
    this.pubsub = new PubSub({
      projectId: this.config.projectId,
      ...(config.emulator.enabled ? { apiEndpoint: config.emulator.apiEndpoint } : {}),
    });
  }

  async onModuleInit() {
    if (this.config.emulator.enabled) {
      await this.setupMultipleTopics();
    }
  }

  async setupMultipleTopics() {
    for (const config of this.config.emulator.topics) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const topicName: string | undefined = this.config.topics[config.name];

      if (!topicName) continue;

      const [topic] = await this.pubsub.topic(topicName).get({ autoCreate: true });

      for (const sub of config.subscriptions) {
        const subscription = topic.subscription(sub);

        const [exists] = await subscription.exists();

        if (!exists) {
          await topic.createSubscription(sub, {
            pushConfig: {
              pushEndpoint: this.config.emulator.pushEndpoint,
            },
          });
        }
      }
    }
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
