import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MediaController } from './media.controller';
import { MediaService } from './services/media.service';
import { ImageConversionService } from './services/image-conversion.service';
import { MediaProcessor } from './processors/media.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'media' }),
  ],
  controllers: [MediaController],
  providers: [MediaService, ImageConversionService, MediaProcessor],
  exports: [MediaService],
})
export class MediaModule {}
