import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import { ApiClientError } from '../../../shared/api/api-types';
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
} from '../api/creators-api';
import type {
  AvailabilityUpdate,
  CreatorAdmin,
  CreatorOwner,
  CreatorProfileInput,
  PortfolioItem,
} from '../types/creator-types';
import {
  creatorProfileQueryKey,
  useCreatorProfile,
  usePortfolioActions,
  useSubmitProfileForReview,
  useUpdateAvailability,
  useUpdateCreatorProfile,
  useUploadAvatar,
} from './use-creator-profile';
import { reviewQueueQueryKey, useReviewCreator, useReviewQueue } from './use-review-queue';

// Mock toàn bộ api module — hook chỉ gọi api + invalidate, không có HTTP thật (CRE-001..010).
vi.mock('../api/creators-api', () => ({
  fetchCreators: vi.fn(),
  fetchCreatorById: vi.fn(),
  fetchCreatorProfile: vi.fn(),
  updateCreatorProfile: vi.fn(),
  submitProfileForReview: vi.fn(),
  updateAvailability: vi.fn(),
  uploadPortfolio: vi.fn(),
  addPortfolioLink: vi.fn(),
  deletePortfolioItem: vi.fn(),
  uploadAvatar: vi.fn(),
  fetchReviewQueue: vi.fn(),
  reviewCreator: vi.fn(),
}));

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

const profileInputFixture: CreatorProfileInput = {
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

// Reset call-count/implementation giữa các test — tránh rò rỉ từ test trước.
beforeEach(() => {
  vi.clearAllMocks();
});

/** QueryClient mới mỗi test — retry:false + gcTime:0 để không rò rỉ cache giữa các test. */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

describe('creatorProfileQueryKey', () => {
  it('factory chuẩn — query key hồ sơ creator đang đăng nhập (CRE-001)', () => {
    expect(creatorProfileQueryKey).toEqual(['creators', 'me']);
  });
});

describe('useCreatorProfile (CRE-001)', () => {
  it('fetch thành công → trả về CreatorOwner', async () => {
    vi.mocked(fetchCreatorProfile).mockResolvedValue(ownerFixture);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatorProfile(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ownerFixture);
    expect(fetchCreatorProfile).toHaveBeenCalled();
  });

  it('thất bại (404) → trả về error, hook không redirect (UI xử lý onboarding sau)', async () => {
    vi.mocked(fetchCreatorProfile).mockRejectedValue(
      new ApiClientError('NOT_FOUND', 'Không tìm thấy hồ sơ.', 404),
    );
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreatorProfile(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiClientError);
  });
});

describe('useUpdateCreatorProfile (CRE-001..006)', () => {
  it('PATCH /creators/me với input + invalidate profile & danh sách công khai', async () => {
    vi.mocked(fetchCreatorProfile).mockResolvedValue(ownerFixture);
    vi.mocked(updateCreatorProfile).mockResolvedValue(ownerFixture);
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Mount profile query để chứng minh invalidate kích hoạt refetch thật.
    renderHook(() => useCreatorProfile(), { wrapper });
    await waitFor(() => expect(fetchCreatorProfile).toHaveBeenCalledTimes(1));
    const fetchesBeforeMutate = vi.mocked(fetchCreatorProfile).mock.calls.length;

    const { result } = renderHook(() => useUpdateCreatorProfile(), { wrapper });

    act(() => {
      result.current.mutate(profileInputFixture);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // TanStack Query gọi mutationFn(variables, context) — context nội bộ là arg 2, chỉ assert variables (arg 1).
    expect(vi.mocked(updateCreatorProfile).mock.calls[0]?.[0]).toEqual(profileInputFixture);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators', 'me'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators'] });
    // invalidateQueries trên query đang active → refetch → số lần gọi api tăng sau mutation.
    await waitFor(() =>
      expect(vi.mocked(fetchCreatorProfile).mock.calls.length).toBeGreaterThan(fetchesBeforeMutate),
    );
  });
});

describe('useSubmitProfileForReview (CRE-007)', () => {
  it('POST submit-review + invalidate profile', async () => {
    vi.mocked(submitProfileForReview).mockResolvedValue(ownerFixture);
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSubmitProfileForReview(), { wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(submitProfileForReview).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators', 'me'] });
  });
});

describe('useUpdateAvailability (CRE-010)', () => {
  it('PATCH /creators/me/availability với body + invalidate profile', async () => {
    const input: AvailabilityUpdate = { availableDays: ['mon', 'tue'], isPaused: true };
    vi.mocked(updateAvailability).mockResolvedValue(ownerFixture);
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateAvailability(), { wrapper });

    act(() => {
      result.current.mutate(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(updateAvailability).mock.calls[0]?.[0]).toEqual(input);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators', 'me'] });
  });
});

describe('usePortfolioActions (CRE-004)', () => {
  it('trả về { upload, addLink, remove } — mỗi thao tác gọi đúng api + invalidate profile', async () => {
    const file = new File(['abc'], 'photo.jpg', { type: 'image/jpeg' });
    vi.mocked(uploadPortfolio).mockResolvedValue(portfolioItemFixture);
    vi.mocked(addPortfolioLink).mockResolvedValue(linkItemFixture);
    vi.mocked(deletePortfolioItem).mockResolvedValue(undefined);
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePortfolioActions(), { wrapper });

    act(() => {
      result.current.upload.mutate({ file, caption: 'Ảnh demo', category: 'f&b' });
    });
    await waitFor(() => expect(result.current.upload.isSuccess).toBe(true));
    expect(uploadPortfolio).toHaveBeenCalledWith(file, 'Ảnh demo', 'f&b');

    act(() => {
      result.current.addLink.mutate({ url: 'https://example.com/demo', caption: 'Link demo' });
    });
    await waitFor(() => expect(result.current.addLink.isSuccess).toBe(true));
    expect(vi.mocked(addPortfolioLink).mock.calls[0]?.[0]).toEqual({
      url: 'https://example.com/demo',
      caption: 'Link demo',
    });

    act(() => {
      result.current.remove.mutate('item_1');
    });
    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
    expect(vi.mocked(deletePortfolioItem).mock.calls[0]?.[0]).toEqual('item_1');

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators', 'me'] });
  });
});

describe('useUploadAvatar (CRE-001)', () => {
  it('POST avatar với file + invalidate profile', async () => {
    const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
    vi.mocked(uploadAvatar).mockResolvedValue({ ...ownerFixture, avatarUrl: '/uploads/avatar.jpg' });
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUploadAvatar(), { wrapper });

    act(() => {
      result.current.mutate(file);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(uploadAvatar).mock.calls[0]?.[0]).toEqual(file);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators', 'me'] });
  });
});

describe('useReviewQueue (CRE-008)', () => {
  it('trả về NGUYÊN envelope (data + meta) — không unwrap để giữ phân trang', async () => {
    const envelope: ApiSuccessBody<readonly CreatorAdmin[]> = {
      success: true,
      data: [adminFixture],
      error: null,
      meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
    };
    vi.mocked(fetchReviewQueue).mockResolvedValue(envelope);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useReviewQueue({ status: 'pending_review', page: 1, limit: 12 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchReviewQueue).toHaveBeenCalledWith({ status: 'pending_review', page: 1, limit: 12 });
    expect(result.current.data).toEqual(envelope);
  });

  it('reviewQueueQueryKey factory — gồm filter', () => {
    expect(reviewQueueQueryKey({ status: 'pending_review', page: 1 })).toEqual([
      'creators',
      'reviews',
      { status: 'pending_review', page: 1 },
    ]);
  });
});

describe('useReviewCreator (CRE-008)', () => {
  it('POST /creators/:id/review + invalidate hàng chờ & profile', async () => {
    vi.mocked(reviewCreator).mockResolvedValue(adminFixture);
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReviewCreator(), { wrapper });

    act(() => {
      result.current.mutate({ creatorId: 'crt_0001', action: 'approve' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reviewCreator).toHaveBeenCalledWith('crt_0001', { action: 'approve' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators', 'reviews'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators', 'me'] });
  });
});
