import { Inject, Injectable } from '@nestjs/common';
import { ErrorManagerService, MessageAction, MessageEntity } from '@repo/nest-shared';
import {
	type DocumentsDeletionQuery,
	type DocumentsIds,
	type EnqueuedTaskPromise,
	type Faceting,
	type FilterableAttributes,
	Index,
	type IndexOptions,
	MeiliSearch,
	type RecordAny,
	type SearchResponse,
	type SortableAttributes,
} from 'meilisearch';

import { MEILISEARCH_CLIENT } from './meilisearch.constants';
import type { SearchParams } from './meilisearch.interfaces';

@Injectable()
export class MeiliSearchService {
	constructor(
		private readonly errorManagerService: ErrorManagerService,
		@Inject(MEILISEARCH_CLIENT) private readonly searchClient: MeiliSearch,
	) {}

	async getIndex<T extends Record<string, any>>(index: string): Promise<Index<T> | null> {
		try {
			return await this.searchClient.getIndex<T>(index);
		} catch (error) {
			this.errorManagerService.logError(
				error,
				MeiliSearchService.name,
				MessageAction.GET_INDEX,
				MessageEntity.MEILISEARCH,
				{ index },
			);
		}

		return null;
	}

	async addDocuments<T extends RecordAny>(index: string, documents: T[]) {
		try {
			return await this.searchClient.index<T>(index).addDocuments(documents);
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				MeiliSearchService.name,
				MessageAction.ADD_DOCUMENTS,
				MessageEntity.MEILISEARCH,
				{ index, documents },
			);
		}
	}

	async deleteDocuments<T extends RecordAny>(index: string, params: DocumentsDeletionQuery | DocumentsIds) {
		try {
			return await this.searchClient.index<T>(index).deleteDocuments(params);
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				MeiliSearchService.name,
				MessageAction.DELETE_DOCUMENTS,
				MessageEntity.MEILISEARCH,
				{ index, params },
			);
		}
	}

	async updateDocuments<T extends RecordAny>(index: string, documents: Partial<T>[]) {
		try {
			return await this.searchClient.index<T>(index).updateDocuments(documents);
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				MeiliSearchService.name,
				MessageAction.UPDATE_DOCUMENTS,
				MessageEntity.MEILISEARCH,
				{ index, documents },
			);
		}
	}

	async search<T extends RecordAny>(index: string, query: string, params: SearchParams): Promise<SearchResponse<T>> {
		try {
			if (params.page) {
				params.offset = (params.page - 1) * (params.limit || 1);
				delete params.page;
			}

			return await this.searchClient.index<T>(index).search<T, SearchParams>(query, params);
		} catch (error) {
			this.errorManagerService.logErrorAndThrow(
				error,
				MeiliSearchService.name,
				MessageAction.SEARCH_DOCUMENTS,
				MessageEntity.MEILISEARCH,
				{ index, query, params },
			);
		}
	}

	createIndex(index: string, options: IndexOptions = {}): EnqueuedTaskPromise {
		return this.searchClient.createIndex(index, options);
	}

	updateSortableAttributes<T extends Record<string, any>>(
		index: string,
		sortableAttributes: SortableAttributes,
	): EnqueuedTaskPromise {
		return this.searchClient.index<T>(index).updateSortableAttributes(sortableAttributes);
	}

	updateFilterableAttributes<T extends Record<string, any>>(
		index: string,
		filterableAttributes: FilterableAttributes,
	): EnqueuedTaskPromise {
		return this.searchClient.index<T>(index).updateFilterableAttributes(filterableAttributes);
	}

	updateFaceting<T extends Record<string, any>>(index: string, faceting: Faceting): EnqueuedTaskPromise {
		return this.searchClient.index<T>(index).updateFaceting(faceting);
	}
}
