import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { LoggingInterceptor, ResponseTransformInterceptor } from './common/interceptors';
import { PrismaExceptionFilter } from './infrastructure/prisma';
import { validationConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security
  app.use(helmet());
  app.enableCors({
    origin: config.get('app.corsOrigin', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global Pipes
  app.useGlobalPipes(new ValidationPipe(validationConfig));

  // Global Interceptors
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ClassSerializerInterceptor(reflector),
    new ResponseTransformInterceptor(reflector),
  );

  // Global Filters (order matters: last registered = first executed)
  app.useGlobalFilters(
    new GlobalExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = config.get('app.port', 3000);
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}
bootstrap();
