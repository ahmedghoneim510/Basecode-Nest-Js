import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  disk: process.env.STORAGE_DISK || 'local',
  local: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    serveUrl: process.env.APP_URL || 'http://localhost:3000',
  },
  s3: {
    bucket: process.env.AWS_S3_BUCKET || '',
    region: process.env.AWS_S3_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  },
}));
