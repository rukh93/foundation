import { PUBSUB_HANDLER_KIND } from './pubsub.constants';

export function PubSubHandler(kind: string): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(PUBSUB_HANDLER_KIND, kind, target);
  };
}

export function getPubSubHandlerKind(target: object): string | undefined {
  return Reflect.getMetadata(PUBSUB_HANDLER_KIND, target) as string | undefined;
}
