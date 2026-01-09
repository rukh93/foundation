import { registerAs } from '@nestjs/config';

export default registerAs('pubsub', () => ({
  topics: {
    webhooks: process.env.PUBSUB_TOPIC_NAME_WEBHOOKS!,
  },
  pushAudience: process.env.PUBSUB_PUSH_AUDIENCE!,
  pushServiceAccountEmail: process.env.PUBSUB_PUSH_SA_EMAIL!,
  projectId: process.env.GCP_PROJECT_ID!,
}));
