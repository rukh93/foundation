import { Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import ms from 'ms';

@Injectable()
export class RedisCacheService {
  constructor(
    private readonly cacheManager: Cache,
    private readonly tokenName: string,
  ) {}

  async set<T = unknown>(orgId: string, key: string, value: T, time: ms.StringValue): Promise<T> {
    return this.cacheManager.set<T>(`${this.tokenName}_${orgId}_${key}`, value, ms(time));
  }

  async get<T = unknown>(orgId: string, key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(`${this.tokenName}_${orgId}_${key}`);
  }

  async setGlobal<T = unknown>(key: string, value: T, time: ms.StringValue): Promise<T> {
    return this.cacheManager.set<T>(`${this.tokenName}_${key}`, value, ms(time));
  }

  async getGlobal<T = unknown>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(`${this.tokenName}_${key}`);
  }
}
