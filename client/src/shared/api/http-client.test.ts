import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiClientError } from './api-types';
import { toApiClientError } from './http-client';

const axiosErrorWithBody = (status: number, body: unknown): AxiosError => {
  const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST');
  error.response = {
    data: body,
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
};

describe('toApiClientError', () => {
  it('giữ nguyên code và message từ envelope lỗi của server', () => {
    const error = toApiClientError(
      axiosErrorWithBody(404, {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy creator này.' },
      }),
    );

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Không tìm thấy creator này.');
  });

  it('map lỗi mạng thành message thân thiện', () => {
    const error = toApiClientError(new AxiosError('Network Error', 'ERR_NETWORK'));

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toContain('Không thể kết nối máy chủ');
  });

  it('map lỗi không xác định về UNKNOWN', () => {
    const error = toApiClientError(new Error('boom'));

    expect(error.code).toBe('UNKNOWN');
    expect(error.statusCode).toBeNull();
  });
});
