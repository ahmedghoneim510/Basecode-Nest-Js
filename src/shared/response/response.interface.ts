/**
 * Unified API response format.
 * Every endpoint (success or error) returns this shape.
 *
 * Success:
 * {
 *   "success": true,
 *   "statusCode": 200,
 *   "message": "Operation successful",
 *   "data": { ... },
 *   "meta": { ... }          // only for paginated responses
 * }
 *
 * Error:
 * {
 *   "success": false,
 *   "statusCode": 400,
 *   "message": "Validation failed",
 *   "data": null,
 *   "errors": [...]           // only for validation errors
 * }
 */
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta?: PaginationMeta;
  errors?: any;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}
