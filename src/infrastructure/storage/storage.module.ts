import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_DRIVER } from './interfaces/storage-driver.interface';
import { LocalStorage } from './drivers/local.storage';
import { S3Storage } from './drivers/s3.storage';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorage,
    S3Storage,
    {
      provide: STORAGE_DRIVER,
      useFactory: (config: ConfigService, local: LocalStorage, s3: S3Storage) => {
        const disk = config.get('storage.disk', 'local');
        const drivers = new Map<string, any>([
          ['local', local],
          ['s3', s3],
        ]);
        const driver = drivers.get(disk);
        if (!driver) throw new Error(`Storage driver "${disk}" not registered`);
        return driver;
      },
      inject: [ConfigService, LocalStorage, S3Storage],
    },
  ],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
