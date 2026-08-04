export interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

/**
 * Operational error with an HTTP status and a stable machine-readable code.
 * Anything that is NOT an ApiError is treated as an unexpected 500.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: readonly ApiErrorDetail[] | undefined;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: readonly ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: readonly ApiErrorDetail[]): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static validation(details: readonly ApiErrorDetail[]): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.', details);
  }

  static unauthorized(message = 'Bạn cần đăng nhập để thực hiện thao tác này.'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này.'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Không tìm thấy tài nguyên yêu cầu.'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  /** Creator chưa có hồ sơ — client redirect sang onboarding (CRE-001). */
  static profileNotFound(message = 'Bạn chưa có hồ sơ creator. Hãy tạo hồ sơ trước.'): ApiError {
    return new ApiError(404, 'PROFILE_NOT_FOUND', message);
  }

  /** Hồ sơ đang bị khóa (pending_review/suspended) — không cho thao tác (CRE-007). */
  static profileLocked(
    message = 'Hồ sơ đang được xử lý hoặc đã bị khóa, không thể thao tác lúc này.',
  ): ApiError {
    return new ApiError(409, 'PROFILE_LOCKED', message);
  }

  /** Hồ sơ thiếu thông tin bắt buộc để gửi duyệt (CRE-001). */
  static profileIncomplete(message = 'Hồ sơ chưa đủ thông tin bắt buộc để gửi duyệt.'): ApiError {
    return new ApiError(400, 'PROFILE_INCOMPLETE', message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'): ApiError {
    return new ApiError(429, 'TOO_MANY_REQUESTS', message);
  }

  static internal(message = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
