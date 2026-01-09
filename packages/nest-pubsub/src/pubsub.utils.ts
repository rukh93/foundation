import type { PubSubPushEnvelope } from './pubsub.types';

export function decodePubSubMessageData<T = unknown>(body: PubSubPushEnvelope): T {
  const b64 = body?.message?.data;

  if (!b64) {
    throw new Error('[PUBSUB]: Missing message.data');
  }

  const raw = Buffer.from(b64, 'base64').toString('utf8');

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('[PUBSUB]: Invalid JSON in message.data');
  }
}
