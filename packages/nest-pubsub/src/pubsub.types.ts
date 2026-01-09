export type PubSubHandleContext = {
  messageId?: string;
  attributes?: Record<string, string>;
};

export type PubSubPushEnvelope = {
  message: PubSubHandleContext & {
    data?: string;
    publishTime?: string;
  };
  subscription?: string;
};

export type GenerationMessage = {
  kind: string;
  jobId: string;
};
