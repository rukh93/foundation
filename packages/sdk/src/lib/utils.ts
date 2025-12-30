import type { DtoError } from '../types';

export function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';

  const usp = new URLSearchParams();

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;

    if (Array.isArray(v)) {
      for (const item of v) usp.append(k, String(item));
    } else if (typeof v === 'object') {
      usp.set(k, JSON.stringify(v));
    } else {
      usp.set(k, String(v));
    }
  }

  const s = usp.toString();

  return s ? `?${s}` : '';
}

export function buildUrl(baseUrl: string, prefix: string, path: string, query?: Record<string, unknown>): string {
  if (!path.startsWith('/')) {
    throw new Error(`SDK path must start with "/": received "${path}"`);
  }

  return `${baseUrl}/${prefix}${path}${toQuery(query)}`;
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export function convertDtoToErrors(data: DtoError[]) {
  return data.reduce((accumulator: Record<string, string>, error: DtoError) => {
    accumulator[error.property] = error.message.join('. ');

    return accumulator;
  }, {});
}
