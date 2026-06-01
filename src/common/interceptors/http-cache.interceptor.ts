import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Observable, of, tap } from 'rxjs';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cached.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKeyPrefix = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (!cacheKeyPrefix) {
      return next.handle();
    }

    const queryString = request.url.split('?')[1] || '';
    const cacheKey = queryString ? `${cacheKeyPrefix}:${queryString}` : cacheKeyPrefix;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) ?? 60;

    return next.handle().pipe(
      tap(async (response) => {
        await this.cache.set(cacheKey, response, ttl * 1000);
      }),
    );
  }
}
