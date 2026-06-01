export interface ApiResponse<T = any> {
  success: boolean;
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
