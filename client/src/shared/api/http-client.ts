import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clientEnv } from '../config/env';
import {
  getAccessToken,
  notifySessionExpired,
  setAccessToken,
} from './auth-session';
import { ApiClientError, type ApiErrorBody, type ApiSuccessBody } from './api-types';

const DEFAULT_TIMEOUT_MS = 15_000;

export const httpClient = axios.create({
  baseURL: clientEnv.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Client "trần" cho refresh — không interceptor để tránh lặp vô hạn. */
const bareClient = axios.create({
  baseURL: clientEnv.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
});

interface RefreshResponseData {
  readonly user: unknown;
  readonly accessToken: string;
}

let inflightRefresh: Promise<RefreshResponseData> | null = null;

/** Gọi /auth/refresh (cookie httpOnly) và cập nhật access token trong bộ nhớ. */
export const refreshSession = (): Promise<RefreshResponseData> => {
  inflightRefresh ??= bareClient
    .post<ApiSuccessBody<RefreshResponseData>>('/auth/refresh')
    .then((response) => {
      setAccessToken(response.data.data.accessToken);
      return response.data.data;
    })
    .finally(() => {
      inflightRefresh = null;
    });
  return inflightRefresh;
};

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// 401 lần đầu (ngoài các endpoint auth) → thử refresh một lần rồi gọi lại request.
httpClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 401 && error.config) {
    const config = error.config as RetriableConfig;
    const isAuthEndpoint = config.url?.includes('/auth/') ?? false;
    if (!config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        await refreshSession();
        return await httpClient.request(config);
      } catch {
        notifySessionExpired();
      }
    }
  }
  throw error;
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

export const apiPost = async <T>(url: string, body?: unknown): Promise<ApiSuccessBody<T>> => {
  try {
    const response = await httpClient.post<ApiSuccessBody<T>>(url, body);
    return response.data;
  } catch (error) {
    throw toApiClientError(error);
  }
};
