import type { DocumentsQuery as MeiliSearchDocumentsQuery, SearchParams as MeiliSearchSearchParams } from 'meilisearch';

export interface SearchParams extends MeiliSearchSearchParams {
  page?: number;
}

export interface DocumentsQuery<T> extends MeiliSearchDocumentsQuery<T> {
  page?: number;
}

export interface SearchParamFilter {
  [key: string]: string[];
}
