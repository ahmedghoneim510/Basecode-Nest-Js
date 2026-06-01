import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

/**
 * Automatically sets correct HTTP status codes:
 * - POST that creates a resource (response has data.id) → 201
 * - All other POST → 200
 * - Respects explicit @HttpCode() if set
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();

        const explicitCode = this.reflector.get<number>(
          HTTP_CODE_METADATA,
          context.getHandler(),
        );

        if (!explicitCode && request.method === 'POST') {
          const isCreation = data?.data?.id !== undefined;
          response.statusCode = isCreation ? 201 : 200;
        }

        return data;
      }),
    );
  }
}
