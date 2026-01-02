// API Response type definitions

// Generic API Response
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

// Success Response
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  status: 'success';
  data: T;
}

// Validation Error Detail
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

// Error Response
export interface ApiError {
  status: 'error';
  message: string;
  statusCode?: number;
  errors?: ValidationErrorDetail[];
  stack?: string;
}

// Pagination Metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

// Paginated Response
export interface PaginatedResponse<T = any> {
  status: 'success';
  message: string;
  data: T[];
  pagination: PaginationMeta;
}

// Query Parameters for Pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  fields?: string;
}
