import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { HttpCacheInterceptor } from '../interceptors/http-cache.interceptor';
import { CacheInvalidateInterceptor } from '../interceptors/cache-invalidate.interceptor';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';
export const CACHE_INVALIDATE_METADATA = 'cache_invalidate';

/**
 * Cache a GET endpoint response in Redis.
 *
 * @param key - Redis key prefix
 * @param ttlSeconds - Cache TTL in seconds (default 60)
 *
 * Usage:
 *   @Cached('users:all', 30)
 *   @Get()
 *   findAll() { ... }
 */
export const Cached = (key: string, ttlSeconds = 60) =>
  applyDecorators(
    SetMetadata(CACHE_KEY_METADATA, key),
    SetMetadata(CACHE_TTL_METADATA, ttlSeconds),
    UseInterceptors(HttpCacheInterceptor),
  );

/**
 * Invalidate cache keys after a mutation completes.
 *
 * Usage:
 *   @Invalidate('users:all')
 *   @Delete(':id')
 *   remove() { ... }
 */
export const Invalidate = (...prefixes: string[]) =>
  applyDecorators(
    SetMetadata(CACHE_INVALIDATE_METADATA, prefixes),
    UseInterceptors(CacheInvalidateInterceptor),
  );
