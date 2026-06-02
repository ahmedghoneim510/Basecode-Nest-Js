import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageDriver } from '../interfaces/storage-driver.interface';

@Injectable()
export class S3Storage implements StorageDriver {
  private readonly logger = new Logger(S3Storage.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get('storage.s3.bucket', '');
    this.region = this.config.get('storage.s3.region', 'us-east-1');
    this.endpoint = this.config.get('storage.s3.endpoint');

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.get('storage.s3.accessKeyId', ''),
        secretAccessKey: this.config.get('storage.s3.secretAccessKey', ''),
      },
      ...(this.endpoint && { endpoint: this.endpoint, forcePathStyle: true }),
    });
  }

  private getKey(directory: string, fileName: string): string {
    return `${directory}/${fileName}`;
  }

  async upload(file: Buffer, directory: string, fileName: string, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.getKey(directory, fileName),
        Body: file,
        ContentType: mimeType,
      }),
    );
    this.logger.debug(`Uploaded to S3: ${directory}/${fileName}`);
  }

  async delete(directory: string, fileName: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: this.getKey(directory, fileName),
        }),
      );
    } catch {
      this.logger.warn(`Failed to delete from S3: ${directory}/${fileName}`);
    }
  }

  async exists(directory: string, fileName: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.getKey(directory, fileName),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(directory: string, fileName: string): string {
    const key = this.getKey(directory, fileName);
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(directory: string, fileName: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.getKey(directory, fileName),
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async move(fromDir: string, fromFile: string, toDir: string, toFile: string): Promise<void> {
    await this.copy(fromDir, fromFile, toDir, toFile);
    await this.delete(fromDir, fromFile);
  }

  async copy(fromDir: string, fromFile: string, toDir: string, toFile: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${this.getKey(fromDir, fromFile)}`,
        Key: this.getKey(toDir, toFile),
      }),
    );
  }
}
