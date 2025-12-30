import { createKeyv } from '@keyv/redis';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

import config from './redis-cache.config';
import {
  CACHE_GROUP_DYNAMIC,
  CACHE_GROUP_GENERAL,
  REDIS_CACHE_DEFAULT,
  REDIS_CACHE_DYNAMIC,
  TOKEN_VARIABLE,
} from './redis-cache.constants';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(config)],
})
export class RedisCacheModule {
  static forRoot(): DynamicModule {
    const tokenProvider: Provider = {
      provide: CACHE_GROUP_GENERAL,
      useValue: 'general',
    };

    const serviceProvider: Provider = {
      provide: REDIS_CACHE_DEFAULT,
      useFactory: (cacheManager: Cache, tokenName: string) => new RedisCacheService(cacheManager, tokenName),
      inject: [CACHE_MANAGER, CACHE_GROUP_GENERAL],
    };

    return {
      module: RedisCacheModule,
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          useFactory: (configService: ConfigService) => ({
            stores: [
              createKeyv({
                // eslint-disable-next-line max-len
                url: `redis://${configService.get<string>('redis.host')}:${configService.get<number>('redis.port')}`,
                username: configService.get<string>('redis.username'),
                password: configService.get<string>('redis.password'),
              }),
            ],
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [tokenProvider, serviceProvider],
      exports: [serviceProvider],
    };
  }

  static forFeature(name: string): DynamicModule {
    const token: string = name.toUpperCase();
    const redisCacheName: string = REDIS_CACHE_DYNAMIC.replace(TOKEN_VARIABLE, token);
    const cacheGroupName: string = CACHE_GROUP_DYNAMIC.replace(TOKEN_VARIABLE, token);

    const tokenProvider: Provider = {
      provide: cacheGroupName,
      useValue: name,
    };

    const serviceProvider: Provider = {
      provide: redisCacheName,
      useFactory: (cacheManager: Cache, tokenName: string) => new RedisCacheService(cacheManager, tokenName),
      inject: [CACHE_MANAGER, cacheGroupName],
    };

    return {
      module: RedisCacheModule,
      providers: [tokenProvider, serviceProvider],
      exports: [serviceProvider],
    };
  }
}
