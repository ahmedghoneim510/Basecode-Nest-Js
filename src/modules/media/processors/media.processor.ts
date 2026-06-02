import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { STORAGE_DRIVER } from '../../../infrastructure/storage/interfaces/storage-driver.interface';
import type { StorageDriver } from '../../../infrastructure/storage/interfaces/storage-driver.interface';
import { ImageConversionService } from '../services/image-conversion.service';

interface ConversionJobData {
  mediaId: number;
  buffer: string; // base64 encoded
  fileName: string;
  directory: string;
}

@Processor('media')
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(
    private prisma: PrismaService,
    private imageService: ImageConversionService,
    @Inject(STORAGE_DRIVER) private storage: StorageDriver,
  ) {
    super();
  }

  async process(job: Job<ConversionJobData>): Promise<void> {
    const { mediaId, buffer, fileName, directory } = job.data;

    this.logger.log(`Processing conversions for media ${mediaId}`);

    const fileBuffer = Buffer.from(buffer, 'base64');
    const conversionsDir = `${directory}/conversions`;

    const results = await this.imageService.generateConversions(
      fileBuffer,
      fileName,
      ['thumb', 'medium', 'large'],
    );

    for (const result of results) {
      // Upload conversion to storage
      await this.storage.upload(result.buffer, conversionsDir, result.fileName, result.mimeType);

      // Save conversion record
      await this.prisma.mediaConversion.create({
        data: {
          mediaId,
          name: result.name,
          fileName: result.fileName,
          directory: conversionsDir,
          mimeType: result.mimeType,
          size: result.size,
          width: result.width,
          height: result.height,
        },
      });
    }

    // Update media metadata with conversion info
    await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        metadata: {
          conversionsGenerated: true,
          conversionNames: results.map((r) => r.name),
          processedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Conversions completed for media ${mediaId}: ${results.map((r) => r.name).join(', ')}`);
  }
}
