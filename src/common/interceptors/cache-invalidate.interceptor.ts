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
import { Observable, tap } from 'rxjs';
import { CACHE_INVALIDATE_METADATA } from '../decorators/cached.decorator';

@Injectable()
export class CacheInvalidateInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const prefixes = this.reflector.get<string[]>(
      CACHE_INVALIDATE_METADATA,
      context.getHandler(),
    );

    if (!prefixes || prefixes.length === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        for (const prefix of prefixes) {
          await this.cache.del(prefix);
        }
      }),
    );
  }
}
