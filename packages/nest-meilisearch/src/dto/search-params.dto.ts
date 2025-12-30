import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import type { SearchParamFilter } from '../meilisearch.interfaces';

export class SearchParamsDto {
  @IsString()
  readonly q: string = '';

  @IsArray()
  readonly facets: string[] = [];

  @Transform(({ value }) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value as string[][];
    }

    const selectedFilters: string[][] = [];

    Object.keys(value as SearchParamFilter).forEach((key: string) => {
      const filterValues: string[] = (value as SearchParamFilter)[key] || [];

      selectedFilters.push(filterValues.map((filterValue: string) => `${key} = '${filterValue}'`));
    });

    return selectedFilters;
  })
  @IsArray()
  readonly filter: string[][] = [];

  @Transform(({ value }) => Number(value || 1))
  @IsNumber()
  @Min(1)
  readonly page: number = 1;

  @Transform(({ value }) => Number(value || 10))
  @IsNumber()
  @Min(10)
  readonly limit: number = 10;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value as string[];
    }

    if (typeof value === 'string' && value.trim()) {
      return [value];
    }

    return undefined;
  })
  @IsArray()
  readonly sort?: string[];
}
