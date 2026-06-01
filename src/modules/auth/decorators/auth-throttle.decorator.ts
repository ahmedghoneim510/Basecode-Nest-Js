import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Strict rate limit for sensitive auth endpoints.
 * 5 attempts per 60 seconds.
 */
export const AuthThrottle = () =>
  applyDecorators(
    Throttle({ short: { ttl: 60000, limit: 5 } }),
  );
