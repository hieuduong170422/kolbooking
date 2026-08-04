import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, type ApiSuccessBody } from './api-types';
import { apiDelete, apiPatch, apiUpload, httpClient, toApiClientError } from './http-client';

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

const okResponse = <T>(data: ApiSuccessBody<T>): AxiosResponse<ApiSuccessBody<T>> =>
  ({ data, status: 200, statusText: 'OK', headers: {}, config: {} }) as AxiosResponse<ApiSuccessBody<T>>;

describe('apiPatch', () => {
  it('gửi PATCH với url + body và trả về nguyên envelope (T12)', async () => {
    const patchSpy = vi
      .spyOn(httpClient, 'patch')
      .mockResolvedValue(okResponse({ success: true, data: { ok: true }, error: null }));

    await expect(
      apiPatch<{ ok: boolean }>('/creators/me/availability', { availableDays: ['monday'] }),
    ).resolves.toEqual({ success: true, data: { ok: true }, error: null });

    expect(patchSpy).toHaveBeenCalledWith('/creators/me/availability', {
      availableDays: ['monday'],
    });
    patchSpy.mockRestore();
  });

  it('chuẩn hóa lỗi qua toApiClientError khi PATCH thất bại', async () => {
    vi.spyOn(httpClient, 'patch').mockRejectedValue(
      axiosErrorWithBody(409, {
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Xung đột trạng thái hồ sơ.' },
      }),
    );

    await expect(apiPatch('/creators/me/availability', {})).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'CONFLICT',
      statusCode: 409,
    });
  });
});

describe('apiUpload', () => {
  it('gửi POST multipart: body là FormData, Content-Type KHÔNG phải application/json (CRE-004)', async () => {
    const postSpy = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue(okResponse({ success: true, data: { itemId: 'item_1' }, error: null }));
    const formData = new FormData();
    formData.append('file', new File(['abc'], 'photo.jpg', { type: 'image/jpeg' }));

    const result = await apiUpload<{ itemId: string }>('/creators/me/portfolio', formData);

    expect(result.data).toEqual({ itemId: 'item_1' });
    expect(postSpy).toHaveBeenCalledWith(
      '/creators/me/portfolio',
      formData,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' }),
      }),
    );
    const config = postSpy.mock.calls[0]?.[2];
    expect(config?.headers?.['Content-Type']).not.toBe('application/json');
    postSpy.mockRestore();
  });

  it('chuẩn hóa lỗi qua toApiClientError khi upload thất bại', async () => {
    vi.spyOn(httpClient, 'post').mockRejectedValue(
      axiosErrorWithBody(400, {
        success: false,
        data: null,
        error: { code: 'BAD_REQUEST', message: 'File không hợp lệ.' },
      }),
    );

    await expect(apiUpload('/creators/me/portfolio', new FormData())).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'BAD_REQUEST',
      statusCode: 400,
    });
  });
});

describe('apiDelete', () => {
  it('gửi DELETE tới url và trả về nguyên envelope (T13)', async () => {
    const deleteSpy = vi
      .spyOn(httpClient, 'delete')
      .mockResolvedValue(okResponse({ success: true, data: null, error: null }));

    await expect(apiDelete('/creators/me/portfolio/item_1')).resolves.toEqual({
      success: true,
      data: null,
      error: null,
    });

    expect(deleteSpy).toHaveBeenCalledWith('/creators/me/portfolio/item_1');
    deleteSpy.mockRestore();
  });

  it('chuẩn hóa lỗi qua toApiClientError khi DELETE thất bại', async () => {
    vi.spyOn(httpClient, 'delete').mockRejectedValue(
      axiosErrorWithBody(404, {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy mục portfolio.' },
      }),
    );

    await expect(apiDelete('/creators/me/portfolio/item_x')).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });
});
