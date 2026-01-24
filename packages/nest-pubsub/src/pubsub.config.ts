import { registerAs } from '@nestjs/config';

export default registerAs('pubsub', () => ({
  topics: {
    webhooks: process.env.PUBSUB_TOPIC_NAME_WEBHOOKS,
    'credits-scheduler': process.env.PUBSUB_TOPIC_NAME_SUB_GRANTS,
  },
  emulator: {
    enabled: process.env.PUBSUB_EMULATOR_ENABLED === 'true',
    apiEndpoint: 'localhost:8085',
    pushEndpoint: 'http://localhost:3000/api/pubsub/push',
    topics: [
      {
        name: 'webhooks',
        subscriptions: [
          'webhooks-push',
        ],
      },
      {
        name: 'credits-scheduler',
        subscriptions: [
          'credits-scheduler-push',
        ],
      },
    ],
  },
  pushAudience: process.env.PUBSUB_PUSH_AUDIENCE,
  pushServiceAccountEmail: process.env.PUBSUB_PUSH_SA_EMAIL,
  projectId: process.env.GCP_PROJECT_ID,
}));
