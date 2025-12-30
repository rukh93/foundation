export type SdkClientOptions = {
  baseUrl: string;
  token: string;
  prefix?: string;
  defaultHeaders?: Record<string, string>;
  customFetch?: typeof fetch;
};

export type RequestOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type RequestParams = {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  options?: RequestOptions;
};

export type RequestResult<D = unknown> = {
  success: boolean;
  message: string;
  data?: D;
  errors?: Record<string, string>;
};

export type DtoError = {
  property: string;
  message: string[];
};
