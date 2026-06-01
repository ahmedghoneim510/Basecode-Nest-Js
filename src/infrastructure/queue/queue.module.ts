import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get('redis.password', undefined),
        },
      }),
    }),
  ],
})
export class QueueModule {}
