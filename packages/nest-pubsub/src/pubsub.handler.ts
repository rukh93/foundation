import type { PubSubHandleContext } from './pubsub.types';

export interface IPubSubHandler<T = unknown> {
  handle(message: T, ctx: PubSubHandleContext): Promise<void>;
}
