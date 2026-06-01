import { registerAs } from '@nestjs/config';

export const throttleConfig = registerAs('throttle', () => ({
  short: { ttl: 1000, limit: 3 },
  medium: { ttl: 10000, limit: 20 },
  long: { ttl: 60000, limit: 100 },
}));
