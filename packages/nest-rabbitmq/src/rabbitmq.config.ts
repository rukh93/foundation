import type { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { registerAs } from '@nestjs/config';

export default registerAs<RabbitMQConfig>('rabbitmq', () => ({
  uri: `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@localhost:5672`,
  exchanges: [
    {
      name: 'entity.events',
      type: 'topic',
      options: { durable: true },
    },
  ],
  connectionInitOptions: { wait: false },
  channels: {
    events: {
      prefetchCount: 10,
      default: true,
    },
  },
}));
