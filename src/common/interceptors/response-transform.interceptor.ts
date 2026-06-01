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
 * Syncs the HTTP status code with the response body's statusCode field.
 * - If response body has `statusCode` (from ResponseService), use it as HTTP status
 * - Respects explicit @HttpCode() if set
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();

        // If @HttpCode() was explicitly set, don't override
        const explicitCode = this.reflector.get<number>(
          HTTP_CODE_METADATA,
          context.getHandler(),
        );

        if (!explicitCode && data?.statusCode) {
          response.statusCode = data.statusCode;
        }

        return data;
      }),
    );
  }
}
