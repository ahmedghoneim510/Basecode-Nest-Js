import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { I18nModule, HeaderResolver, QueryResolver, AcceptLanguageResolver } from 'nestjs-i18n';
import * as path from 'path';

// Config
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  mailConfig,
  throttleConfig,
  storageConfig,
} from './config';

// Infrastructure
import { PrismaModule } from './infrastructure/prisma';
import { RedisCacheModule } from './infrastructure/cache';
import { QueueModule } from './infrastructure/queue';
import { MailModule } from './infrastructure/mail';
import { StorageModule } from './infrastructure/storage/storage.module';

// Shared
import { TranslationModule } from './shared/i18n/i18n.module';
import { ResponseModule } from './shared/response/response.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MediaModule } from './modules/media/media.module';

// App
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // ─── Configuration ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, mailConfig, throttleConfig, storageConfig],
    }),

    // ─── i18n ──────────────────────────────────────────────────────────
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '../i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        { use: HeaderResolver, options: ['x-lang'] },
        AcceptLanguageResolver,
      ],
    }),

    // ─── Rate Limiting ─────────────────────────────────────────────────
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 },
        { name: 'medium', ttl: 10000, limit: 20 },
        { name: 'long', ttl: 60000, limit: 100 },
      ],
    }),

    // ─── Infrastructure ────────────────────────────────────────────────
    PrismaModule,
    RedisCacheModule,
    QueueModule,
    MailModule,
    StorageModule,

    // ─── Shared ────────────────────────────────────────────────────────
    TranslationModule,
    ResponseModule,

    // ─── Feature Modules ───────────────────────────────────────────────
    AuthModule,
    UsersModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
