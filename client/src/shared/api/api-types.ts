export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

export interface ApiErrorPayload {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly ApiErrorDetail[];
}

/** Envelope chuẩn của REST API: { success, data, error, meta }. */
export interface ApiSuccessBody<T> {
  readonly success: true;
  readonly data: T;
  readonly error: null;
  readonly meta?: PaginationMeta;
}

export interface ApiErrorBody {
  readonly success: false;
  readonly data: null;
  readonly error: ApiErrorPayload;
}

/** Lỗi chuẩn hóa phía client — luôn có message hiển thị được cho người dùng. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly statusCode: number | null;
  readonly details: readonly ApiErrorDetail[];

  constructor(
    code: string,
    message: string,
    statusCode: number | null,
    details: readonly ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
