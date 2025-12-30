export type JsonSchema = Record<string, unknown>;
export type Options = {
  system?: string;
  user: string;
  schema: JsonSchema;
  model?: string;
};
