export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const IMAGE_CONVERSIONS = {
  thumb: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
} as const;

export const MEDIA_MESSAGES = {
  UPLOADED: 'media.uploaded',
  DELETED: 'media.deleted',
  NOT_FOUND: 'media.not_found',
  INVALID_FILE_TYPE: 'media.invalid_file_type',
  FILE_TOO_LARGE: 'media.file_too_large',
} as const;
