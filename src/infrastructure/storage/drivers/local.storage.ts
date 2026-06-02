import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageDriver } from '../interfaces/storage-driver.interface';

@Injectable()
export class LocalStorage implements StorageDriver {
  private readonly logger = new Logger(LocalStorage.name);
  private readonly uploadDir: string;
  private readonly serveUrl: string;

  constructor(private config: ConfigService) {
    this.uploadDir = this.config.get('storage.local.uploadDir', './uploads');
    this.serveUrl = this.config.get('storage.local.serveUrl', 'http://localhost:3000');
  }

  async upload(file: Buffer, directory: string, fileName: string): Promise<void> {
    const dir = path.join(this.uploadDir, directory);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), file);
    this.logger.debug(`Stored: ${directory}/${fileName}`);
  }

  async delete(directory: string, fileName: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.uploadDir, directory, fileName));
    } catch {
      this.logger.warn(`File not found: ${directory}/${fileName}`);
    }
  }

  async exists(directory: string, fileName: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.uploadDir, directory, fileName));
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(directory: string, fileName: string): string {
    return `${this.serveUrl}/uploads/${directory}/${fileName}`;
  }

  async getSignedUrl(directory: string, fileName: string): Promise<string> {
    return this.getPublicUrl(directory, fileName);
  }

  async move(fromDir: string, fromFile: string, toDir: string, toFile: string): Promise<void> {
    const src = path.join(this.uploadDir, fromDir, fromFile);
    const destDir = path.join(this.uploadDir, toDir);
    await fs.mkdir(destDir, { recursive: true });
    await fs.rename(src, path.join(destDir, toFile));
  }

  async copy(fromDir: string, fromFile: string, toDir: string, toFile: string): Promise<void> {
    const src = path.join(this.uploadDir, fromDir, fromFile);
    const destDir = path.join(this.uploadDir, toDir);
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(src, path.join(destDir, toFile));
  }
}
