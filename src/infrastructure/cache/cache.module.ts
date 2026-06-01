import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          host: config.get('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get('redis.password', undefined),
          ttl: config.get<number>('redis.ttl', 60) * 1000,
        }),
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
