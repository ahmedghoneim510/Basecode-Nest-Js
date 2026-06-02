import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { IMAGE_CONVERSIONS } from '../constants/media.constants';

export interface ConversionResult {
  name: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  fileName: string;
}

@Injectable()
export class ImageConversionService {
  private readonly logger = new Logger(ImageConversionService.name);

  async generateConversions(
    buffer: Buffer,
    originalFileName: string,
    conversions: string[] = ['thumb', 'medium'],
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const conversionName of conversions) {
      const config = IMAGE_CONVERSIONS[conversionName];
      if (!config) continue;

      try {
        const result = await this.resize(buffer, originalFileName, conversionName, config);
        results.push(result);
      } catch (error) {
        this.logger.error(`Conversion "${conversionName}" failed: ${error.message}`);
      }
    }

    // Generate webp version
    try {
      const webpResult = await this.toWebp(buffer, originalFileName);
      results.push(webpResult);
    } catch (error) {
      this.logger.error(`WebP conversion failed: ${error.message}`);
    }

    return results;
  }

  private async resize(
    buffer: Buffer,
    originalFileName: string,
    name: string,
    config: { width: number; height: number },
  ): Promise<ConversionResult> {
    const output = await sharp(buffer)
      .resize(config.width, config.height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

    const ext = 'jpg';
    const baseName = originalFileName.replace(/\.[^.]+$/, '');
    const fileName = `${baseName}_${name}.${ext}`;

    return {
      name,
      buffer: output.data,
      mimeType: 'image/jpeg',
      size: output.info.size,
      width: output.info.width,
      height: output.info.height,
      fileName,
    };
  }

  private async toWebp(buffer: Buffer, originalFileName: string): Promise<ConversionResult> {
    const output = await sharp(buffer)
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

    const baseName = originalFileName.replace(/\.[^.]+$/, '');
    const fileName = `${baseName}_webp.webp`;

    return {
      name: 'webp',
      buffer: output.data,
      mimeType: 'image/webp',
      size: output.info.size,
      width: output.info.width,
      height: output.info.height,
      fileName,
    };
  }
}
