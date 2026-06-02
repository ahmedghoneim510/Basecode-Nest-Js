export interface StorageDriver {
  upload(file: Buffer, directory: string, fileName: string, mimeType: string): Promise<void>;
  delete(directory: string, fileName: string): Promise<void>;
  exists(directory: string, fileName: string): Promise<boolean>;
  getPublicUrl(directory: string, fileName: string): string;
  getSignedUrl(directory: string, fileName: string, expiresInSeconds?: number): Promise<string>;
  move(fromDir: string, fromFile: string, toDir: string, toFile: string): Promise<void>;
  copy(fromDir: string, fromFile: string, toDir: string, toFile: string): Promise<void>;
}

export const STORAGE_DRIVER = 'STORAGE_DRIVER';
