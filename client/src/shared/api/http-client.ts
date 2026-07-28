import axios, { AxiosError } from 'axios';
import { clientEnv } from '../config/env';
import { ApiClientError, type ApiErrorBody, type ApiSuccessBody } from './api-types';

const DEFAULT_TIMEOUT_MS = 15_000;

export const httpClient = axios.create({
  baseURL: clientEnv.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  (value as { success?: unknown }).success === false &&
  typeof (value as { error?: unknown }).error === 'object';

/** Chuyển mọi lỗi axios thành ApiClientError có message thân thiện. */
export const toApiClientError = (error: unknown): ApiClientError => {
  if (error instanceof AxiosError) {
    const body: unknown = error.response?.data;
    if (isApiErrorBody(body)) {
      return new ApiClientError(
        body.error.code,
        body.error.message,
        error.response?.status ?? null,
        body.error.details ?? [],
      );
    }
    if (error.code === 'ECONNABORTED') {
      return new ApiClientError('TIMEOUT', 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.', null);
    }
    return new ApiClientError(
      'NETWORK_ERROR',
      'Không thể kết nối máy chủ. Kiểm tra kết nối mạng và thử lại.',
      error.response?.status ?? null,
    );
  }
  return new ApiClientError('UNKNOWN', 'Đã xảy ra lỗi không xác định.', null);
};

/** GET trả về nguyên envelope (cần meta cho pagination). */
export const apiGet = async <T>(
  url: string,
  params?: Record<string, string | number | undefined>,
): Promise<ApiSuccessBody<T>> => {
  try {
    const response = await httpClient.get<ApiSuccessBody<T>>(url, { params });
    return response.data;
  } catch (error) {
    throw toApiClientError(error);
  }
};
