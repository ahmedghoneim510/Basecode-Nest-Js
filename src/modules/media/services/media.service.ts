import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import * as path from 'path';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { STORAGE_DRIVER } from '../../../infrastructure/storage/interfaces/storage-driver.interface';
import type { StorageDriver } from '../../../infrastructure/storage/interfaces/storage-driver.interface';
import { ResponseService } from '../../../shared/response/response.service';
import { UploadMediaDto } from '../dto/upload-media.dto';
import { MediaOwnerType } from '../enums/media-owner-type.enum';
import { MediaCollection } from '../enums/media-collection.enum';
import { MediaResponseDto, ConversionResponseDto } from '../interfaces/media-response.interface';
import {
  ALL_ALLOWED_MIME_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MEDIA_MESSAGES,
} from '../constants/media.constants';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly disk: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private response: ResponseService,
    @Inject(STORAGE_DRIVER) private storage: StorageDriver,
    @InjectQueue('media') private mediaQueue: Queue,
  ) {
    this.disk = this.config.get('storage.disk', 'local');
  }

  // ─── UPLOAD ────────────────────────────────────────────────────────────────

  async upload(file: Express.Multer.File, dto: UploadMediaDto) {
    this.validateFile(file);

    const ext = path.extname(file.originalname).slice(1);
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    const directory = dto.directory || this.buildDirectory(dto.modelType, dto.collectionName);

    // Upload original to storage
    await this.storage.upload(file.buffer, directory, uniqueName, file.mimetype);

    // Create database record
    const media = await this.prisma.media.create({
      data: {
        fileName: uniqueName,
        originalName: file.originalname,
        extension: ext,
        mimeType: file.mimetype,
        size: file.size,
        disk: this.disk,
        directory,
        collectionName: dto.collectionName || MediaCollection.DEFAULT,
        modelType: dto.modelType,
        modelId: dto.modelId,
        metadata: {
          uploadedAt: new Date().toISOString(),
        },
      },
      include: { conversions: true },
    });

    // Dispatch conversion job for images
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      await this.mediaQueue.add('generate-conversions', {
        mediaId: media.id,
        buffer: file.buffer.toString('base64'),
        fileName: uniqueName,
        directory,
      });
    }

    this.logger.log(`Media uploaded: ${media.id} → ${dto.modelType}:${dto.modelId}`);

    return this.response.success(this.toDto(media), MEDIA_MESSAGES.UPLOADED);
  }

  // ─── FIND ──────────────────────────────────────────────────────────────────

  async findOne(id: number) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: { conversions: true },
    });

    if (!media) {
      throw new NotFoundException(MEDIA_MESSAGES.NOT_FOUND);
    }

    return this.response.success(this.toDto(media));
  }

  async findByModel(modelType: MediaOwnerType, modelId: number, collection?: MediaCollection) {
    const media = await this.prisma.media.findMany({
      where: {
        modelType,
        modelId,
        ...(collection && { collectionName: collection }),
      },
      include: { conversions: true },
      orderBy: { createdAt: 'desc' },
    });

    return this.response.success(media.map((m) => this.toDto(m)));
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────

  async delete(id: number) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: { conversions: true },
    });

    if (!media) {
      throw new NotFoundException(MEDIA_MESSAGES.NOT_FOUND);
    }

    // Delete conversions from storage
    for (const conversion of media.conversions) {
      await this.storage.delete(conversion.directory, conversion.fileName);
    }

    // Delete original from storage
    await this.storage.delete(media.directory, media.fileName);

    // Delete from database (cascade deletes conversions)
    await this.prisma.media.delete({ where: { id } });

    this.logger.log(`Media deleted: ${id}`);
    return this.response.message(MEDIA_MESSAGES.DELETED);
  }

  async deleteByModel(modelType: MediaOwnerType, modelId: number) {
    const media = await this.prisma.media.findMany({
      where: { modelType, modelId },
      include: { conversions: true },
    });

    for (const m of media) {
      for (const conversion of m.conversions) {
        await this.storage.delete(conversion.directory, conversion.fileName);
      }
      await this.storage.delete(m.directory, m.fileName);
    }

    await this.prisma.media.deleteMany({ where: { modelType, modelId } });
    this.logger.log(`All media deleted for ${modelType}:${modelId}`);

    return this.response.message(MEDIA_MESSAGES.DELETED);
  }

  // ─── REPLACE ───────────────────────────────────────────────────────────────

  async replace(id: number, file: Express.Multer.File) {
    const existing = await this.prisma.media.findUnique({
      where: { id },
      include: { conversions: true },
    });

    if (!existing) {
      throw new NotFoundException(MEDIA_MESSAGES.NOT_FOUND);
    }

    this.validateFile(file);

    // Delete old files
    for (const conversion of existing.conversions) {
      await this.storage.delete(conversion.directory, conversion.fileName);
    }
    await this.storage.delete(existing.directory, existing.fileName);

    // Upload new file
    const ext = path.extname(file.originalname).slice(1);
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;

    await this.storage.upload(file.buffer, existing.directory, uniqueName, file.mimetype);

    // Update record
    const media = await this.prisma.media.update({
      where: { id },
      data: {
        fileName: uniqueName,
        originalName: file.originalname,
        extension: ext,
        mimeType: file.mimetype,
        size: file.size,
      },
      include: { conversions: true },
    });

    // Delete old conversions from DB
    await this.prisma.mediaConversion.deleteMany({ where: { mediaId: id } });

    // Dispatch new conversion job
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      await this.mediaQueue.add('generate-conversions', {
        mediaId: media.id,
        buffer: file.buffer.toString('base64'),
        fileName: uniqueName,
        directory: existing.directory,
      });
    }

    return this.response.success(this.toDto(media), MEDIA_MESSAGES.UPLOADED);
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private validateFile(file: Express.Multer.File): void {
    if (!ALL_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(MEDIA_MESSAGES.INVALID_FILE_TYPE);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(MEDIA_MESSAGES.FILE_TOO_LARGE);
    }
  }

  private buildDirectory(modelType: string, collection?: string): string {
    const base = modelType.toLowerCase();
    return collection && collection !== 'default'
      ? `${base}/${collection}`
      : base;
  }

  private toDto(media: any): MediaResponseDto {
    const conversions: ConversionResponseDto[] = (media.conversions || []).map((c: any) => ({
      name: c.name,
      url: this.storage.getPublicUrl(c.directory, c.fileName),
      mimeType: c.mimeType,
      size: c.size,
      width: c.width,
      height: c.height,
    }));

    return {
      id: media.id,
      uuid: media.uuid,
      fileName: media.fileName,
      originalName: media.originalName,
      extension: media.extension,
      mimeType: media.mimeType,
      size: media.size,
      disk: media.disk,
      collectionName: media.collectionName,
      modelType: media.modelType,
      modelId: media.modelId,
      url: this.storage.getPublicUrl(media.directory, media.fileName),
      conversions,
      metadata: media.metadata,
      createdAt: media.createdAt,
    };
  }
}
