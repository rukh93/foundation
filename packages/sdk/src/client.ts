import { NetworkError } from './errors';
import { buildUrl, convertDtoToErrors, normalizeBaseUrl } from './lib/utils';
import type { RequestParams, RequestResult, SdkClientOptions } from './types';

export class SdkClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly prefix: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly customFetch: typeof fetch;

  constructor(opts: SdkClientOptions) {
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.token = opts.token;
    this.prefix = opts.prefix ?? 'api';
    this.defaultHeaders = opts.defaultHeaders ?? {};
    this.customFetch = opts.customFetch ?? fetch;
  }

  async request<D>(input: RequestParams): Promise<RequestResult<D>> {
    const url = buildUrl(this.baseUrl, this.prefix, input.path, input.query);

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${this.token}`,
      ...this.defaultHeaders,
      ...(input.options?.headers ?? {}),
    };

    let res: Response;

    try {
      res = await this.customFetch(url, {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: input.options?.signal,
      });
    } catch (e: unknown) {
      console.error('SDK client error', ' - ', e);
      throw new NetworkError('NETWORK_FAILED');
    }

    const json = await res.json();

    return {
      success: res.ok,
      message: json.message,
      data: json.data,
      errors: json.message === 'SHARED_DTO_VALIDATION_ERROR' ? convertDtoToErrors(json.data) : undefined,
    };
  }
}
