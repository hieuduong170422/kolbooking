import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import { httpClient } from '../../../shared/api/http-client';
import type {
  AvailabilityUpdate,
  CreatorAdmin,
  CreatorOwner,
  CreatorProfileInput,
  PortfolioItem,
} from '../types/creator-types';
import {
  addPortfolioLink,
  deletePortfolioItem,
  fetchCreatorProfile,
  fetchReviewQueue,
  reviewCreator,
  submitProfileForReview,
  updateAvailability,
  updateCreatorProfile,
  uploadAvatar,
  uploadPortfolio,
} from './creators-api';

const okResponse = <T>(data: ApiSuccessBody<T>): AxiosResponse<ApiSuccessBody<T>> =>
  ({ data, status: 200, statusText: 'OK', headers: {}, config: {} }) as AxiosResponse<ApiSuccessBody<T>>;

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

const ownerFixture: CreatorOwner = {
  id: 'crt_0001',
  displayName: 'Creator Demo',
  avatarUrl: null,
  bio: 'Creator chuyên review ẩm thực.',
  city: 'Hà Nội',
  niches: ['f&b'],
  language: 'vi',
  creatorType: 'koc',
  socialAccounts: [],
  status: 'draft',
  statusReason: null,
  audienceMetrics: null,
  serviceMode: 'both',
  availability: { availableDays: ['mon', 'tue'], isPaused: false },
  portfolioItems: [],
  priceFromVnd: 500000,
  rating: 0,
  completedBookings: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
};

const portfolioItemFixture: PortfolioItem = {
  id: 'item_1',
  type: 'image',
  url: '/uploads/abc.png',
  caption: 'Ảnh demo',
  category: 'f&b',
  thumbnailUrl: null,
  createdAt: '2026-08-01T00:00:00.000Z',
};

const linkItemFixture: PortfolioItem = {
  id: 'item_2',
  type: 'link',
  url: 'https://example.com/demo',
  caption: 'Link demo',
  category: null,
  thumbnailUrl: null,
  createdAt: '2026-08-01T00:00:00.000Z',
};

const adminFixture: CreatorAdmin = { ...ownerFixture, userEmail: 'creator@demo.vn' };

describe('fetchCreatorProfile (CRE-001)', () => {
  it('GET /creators/me → trả về owner DTO (.data)', async () => {
    const getSpy = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue(okResponse({ success: true, data: ownerFixture, error: null }));

    await expect(fetchCreatorProfile()).resolves.toEqual(ownerFixture);

    expect(getSpy).toHaveBeenCalledWith('/creators/me', { params: undefined });
    getSpy.mockRestore();
  });

  it('lan truyền lỗi ApiClientError từ httpClient', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValue(
      axiosErrorWithBody(404, {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ.' },
      }),
    );

    await expect(fetchCreatorProfile()).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });
});

describe('updateCreatorProfile (CRE-001..006)', () => {
  it('PUT /creators/me với input → trả về owner', async () => {
    const input: CreatorProfileInput = {
      displayName: 'Creator Demo',
      bio: 'Creator chuyên review ẩm thực.',
      city: 'Hà Nội',
      niches: ['f&b'],
      language: 'vi',
      creatorType: 'koc',
      socialAccounts: [],
      audienceMetrics: null,
      serviceMode: 'both',
    };
    const putSpy = vi
      .spyOn(httpClient, 'put')
      .mockResolvedValue(okResponse({ success: true, data: ownerFixture, error: null }));

    await expect(updateCreatorProfile(input)).resolves.toEqual(ownerFixture);

    expect(putSpy).toHaveBeenCalledWith('/creators/me', input);
    putSpy.mockRestore();
  });
});

describe('submitProfileForReview (CRE-007)', () => {
  it('POST /creators/me/submit-review → trả về owner', async () => {
    const postSpy = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue(okResponse({ success: true, data: ownerFixture, error: null }));

    await expect(submitProfileForReview()).resolves.toEqual(ownerFixture);

    expect(postSpy).toHaveBeenCalledWith('/creators/me/submit-review', undefined);
    postSpy.mockRestore();
  });
});

describe('updateAvailability (CRE-010)', () => {
  it('PATCH /creators/me/availability với body → trả về owner', async () => {
    const input: AvailabilityUpdate = { availableDays: ['mon', 'tue'], isPaused: true };
    const patchSpy = vi
      .spyOn(httpClient, 'patch')
      .mockResolvedValue(okResponse({ success: true, data: ownerFixture, error: null }));

    await expect(updateAvailability(input)).resolves.toEqual(ownerFixture);

    expect(patchSpy).toHaveBeenCalledWith('/creators/me/availability', input);
    patchSpy.mockRestore();
  });
});

describe('uploadPortfolio (CRE-004)', () => {
  it('POST /creators/me/portfolio với FormData (file + caption + category) → trả về PortfolioItem', async () => {
    const file = new File(['abc'], 'photo.jpg', { type: 'image/jpeg' });
    const postSpy = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue(okResponse({ success: true, data: portfolioItemFixture, error: null }));

    await expect(uploadPortfolio(file, 'Ảnh demo', 'f&b')).resolves.toEqual(portfolioItemFixture);

    expect(postSpy).toHaveBeenCalledWith(
      '/creators/me/portfolio',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' }),
      }),
    );
    const body = postSpy.mock.calls[0]?.[1] as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(body.get('caption')).toBe('Ảnh demo');
    expect(body.get('category')).toBe('f&b');
    postSpy.mockRestore();
  });

  it('không có caption/category: FormData chỉ chứa file', async () => {
    const file = new File(['xyz'], 'clip.mp4', { type: 'video/mp4' });
    const postSpy = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue(okResponse({ success: true, data: portfolioItemFixture, error: null }));

    await uploadPortfolio(file);

    const body = postSpy.mock.calls[0]?.[1] as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('caption')).toBeNull();
    expect(body.get('category')).toBeNull();
    postSpy.mockRestore();
  });
});

describe('addPortfolioLink (CRE-004)', () => {
  it('POST /creators/me/portfolio với body có type=link → trả về PortfolioItem', async () => {
    const postSpy = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue(okResponse({ success: true, data: linkItemFixture, error: null }));

    await expect(
      addPortfolioLink({ url: 'https://example.com/demo', caption: 'Link demo', category: 'f&b' }),
    ).resolves.toEqual(linkItemFixture);

    expect(postSpy).toHaveBeenCalledWith('/creators/me/portfolio', {
      url: 'https://example.com/demo',
      caption: 'Link demo',
      category: 'f&b',
      type: 'link',
    });
    postSpy.mockRestore();
  });
});

describe('deletePortfolioItem (CRE-004)', () => {
  it('DELETE /creators/me/portfolio/:id → resolve undefined', async () => {
    const deleteSpy = vi
      .spyOn(httpClient, 'delete')
      .mockResolvedValue(okResponse({ success: true, data: null, error: null }));

    await expect(deletePortfolioItem('item_1')).resolves.toBeUndefined();

    expect(deleteSpy).toHaveBeenCalledWith('/creators/me/portfolio/item_1');
    deleteSpy.mockRestore();
  });
});

describe('uploadAvatar (CRE-001)', () => {
  it('POST /creators/me/avatar với FormData file → trả về owner', async () => {
    const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
    const postSpy = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue(
        okResponse({ success: true, data: { ...ownerFixture, avatarUrl: '/uploads/avatar.jpg' }, error: null }),
      );

    await expect(uploadAvatar(file)).resolves.toEqual({
      ...ownerFixture,
      avatarUrl: '/uploads/avatar.jpg',
    });

    expect(postSpy).toHaveBeenCalledWith(
      '/creators/me/avatar',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' }),
      }),
    );
    const body = postSpy.mock.calls[0]?.[1] as FormData;
    expect(body.get('file')).toBe(file);
    postSpy.mockRestore();
  });
});

describe('fetchReviewQueue (CRE-008)', () => {
  it('GET /creators/reviews với query params → trả về nguyên envelope (có meta)', async () => {
    const envelope: ApiSuccessBody<readonly CreatorAdmin[]> = {
      success: true,
      data: [adminFixture],
      error: null,
      meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
    };
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue(okResponse(envelope));

    await expect(fetchReviewQueue({ status: 'pending_review', page: 1, limit: 12 })).resolves.toEqual(
      envelope,
    );

    expect(getSpy).toHaveBeenCalledWith('/creators/reviews', {
      params: { status: 'pending_review', page: 1, limit: 12 },
    });
    getSpy.mockRestore();
  });

  it('không có filter: params gồm status/page/limit undefined', async () => {
    const envelope: ApiSuccessBody<readonly CreatorAdmin[]> = {
      success: true,
      data: [],
      error: null,
      meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
    };
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue(okResponse(envelope));

    await expect(fetchReviewQueue()).resolves.toEqual(envelope);

    expect(getSpy).toHaveBeenCalledWith('/creators/reviews', {
      params: { status: undefined, page: undefined, limit: undefined },
    });
    getSpy.mockRestore();
  });
});

describe('reviewCreator (CRE-008)', () => {
  it('POST /creators/:id/review với {action} → trả về CreatorAdmin', async () => {
    const postSpy = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue(okResponse({ success: true, data: adminFixture, error: null }));

    await expect(reviewCreator('crt_0001', { action: 'approve' })).resolves.toEqual(adminFixture);

    expect(postSpy).toHaveBeenCalledWith('/creators/crt_0001/review', { action: 'approve' });
    postSpy.mockRestore();
  });

  it('POST có kèm reason khi reject', async () => {
    const postSpy = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue(okResponse({ success: true, data: adminFixture, error: null }));

    await reviewCreator('crt_0001', { action: 'reject', reason: 'Thiếu thông tin xác minh.' });

    expect(postSpy).toHaveBeenCalledWith('/creators/crt_0001/review', {
      action: 'reject',
      reason: 'Thiếu thông tin xác minh.',
    });
    postSpy.mockRestore();
  });

  it('lan truyền lỗi ApiClientError từ httpClient', async () => {
    vi.spyOn(httpClient, 'post').mockRejectedValue(
      axiosErrorWithBody(409, {
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Không thể duyệt từ trạng thái hiện tại.' },
      }),
    );

    await expect(reviewCreator('crt_0001', { action: 'approve' })).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'CONFLICT',
      statusCode: 409,
    });
  });
});
