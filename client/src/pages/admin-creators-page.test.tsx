import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReviewCreator, useReviewQueue } from '../features/creators/hooks/use-review-queue';
import type { CreatorAdmin, CreatorOwner, CreatorStatus } from '../features/creators/types/creator-types';
import type { ApiSuccessBody } from '../shared/api/api-types';
import { ApiClientError } from '../shared/api/api-types';
import { AdminCreatorsPage } from './admin-creators-page';

// Mock toàn bộ hooks module — page chỉ điều khiển queue + mutation qua hook đã mock,
// không gọi HTTP thật (pattern giống onboarding-page.test.tsx — CRE-008).
vi.mock('../features/creators/hooks/use-review-queue', () => ({
  useReviewQueue: vi.fn(),
  useReviewCreator: vi.fn(),
}));

const mockUseReviewQueue = vi.mocked(useReviewQueue);
const mockUseReviewCreator = vi.mocked(useReviewCreator);

// Fixture 20 trường CreatorAdmin (19 CreatorOwner + userEmail) — copy từ use-creator-profile.test.tsx (CRE-001).
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
  status: 'pending_review',
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

const adminFixture: CreatorAdmin = {
  ...ownerFixture,
  userEmail: 'creator@demo.vn',
  socialAccounts: [
    {
      platform: 'tiktok',
      handle: '@demo',
      url: 'https://www.tiktok.com/@demo',
      followerCount: 1200,
      isVerified: false,
    },
  ],
};

// Envelope chuẩn của GET /creators/reviews — trả nguyên (data + meta) để giữ phân trang.
const envelopeFixture = (creators: CreatorAdmin[]): ApiSuccessBody<readonly CreatorAdmin[]> => ({
  success: true,
  data: creators,
  error: null,
  meta: { page: 1, limit: 12, total: creators.length, totalPages: 1 },
});

// Mutation mock — cấu trúc tối thiểu của useMutation mà page đọc tới.
// Cast qua `as never` vì UseMutationResult có nhiều field nội bộ (client TS non-strict).
const makeMutation = (overrides: Record<string, unknown> = {}) => ({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
  ...overrides,
});

let reviewMutation: ReturnType<typeof makeMutation>;

// Render page với trạng thái queue tùy chọn; mặc định 1 profile pending_review.
const renderPage = (options: {
  data?: ApiSuccessBody<readonly CreatorAdmin[]>;
  isLoading?: boolean;
  isError?: boolean;
} = {}): void => {
  const isError = options.isError ?? false;
  mockUseReviewQueue.mockReturnValue({
    data: options.data ?? envelopeFixture([adminFixture]),
    isLoading: options.isLoading ?? false,
    isError,
    error: isError ? new ApiClientError('SERVER_ERROR', 'Lỗi máy chủ.', 500) : null,
    refetch: vi.fn(),
  } as never);
  render(<AdminCreatorsPage />);
};

// Lấy phần tử row <li> chứa tên creator — scoping tránh đụng label tab trùng tên.
const getRow = (displayName: string): HTMLElement => {
  const row = screen.getByText(displayName).closest('li');
  if (row === null) throw new Error(`Không tìm thấy row chứa ${displayName}`);
  return row;
};

beforeEach(() => {
  vi.clearAllMocks();
  reviewMutation = makeMutation();
  mockUseReviewCreator.mockReturnValue(reviewMutation as never);
});

describe('AdminCreatorsPage (CRE-008, ADM-003)', () => {
  it('render danh sách hàng chờ — displayName + userEmail + badge trạng thái (CRE-008)', () => {
    renderPage();
    const row = getRow('Creator Demo');

    expect(within(row).getByText('creator@demo.vn')).toBeInTheDocument();
    expect(within(row).getByText('Chờ duyệt')).toBeInTheDocument();
    expect(within(row).getByText('Hà Nội')).toBeInTheDocument();
    expect(within(row).getByText('KOC')).toBeInTheDocument();
    expect(within(row).getByText('tiktok / @demo')).toBeInTheDocument();
  });

  it('nhấn Duyệt → mutation gọi { creatorId, action: approve } (CRE-008)', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));

    expect(reviewMutation.mutate).toHaveBeenCalledWith({
      creatorId: 'crt_0001',
      action: 'approve',
    });
  });

  it('nhấn Từ chối → modal mở, Xác nhận disabled khi reason trống → gọi { action: reject, reason } (CRE-008)', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Xác nhận' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Lý do'), {
      target: { value: 'Thiếu giấy tờ xác minh' },
    });
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);

    expect(reviewMutation.mutate).toHaveBeenCalledWith({
      creatorId: 'crt_0001',
      action: 'reject',
      reason: 'Thiếu giấy tờ xác minh',
    });
  });

  it('Tạm khóa chỉ hiện cho profile verified, không hiện cho pending_review (CRE-008)', () => {
    renderPage();
    const pendingRow = getRow('Creator Demo');
    expect(within(pendingRow).queryByRole('button', { name: 'Tạm khóa' })).not.toBeInTheDocument();

    const verifiedFixture: CreatorAdmin = { ...adminFixture, displayName: 'Creator Verified', status: 'verified' };
    renderPage({ data: envelopeFixture([verifiedFixture]) });
    const verifiedRow = getRow('Creator Verified');
    expect(within(verifiedRow).getByRole('button', { name: 'Tạm khóa' })).toBeInTheDocument();
  });

  it('đang tải → hiện LoadingState (CRE-008)', () => {
    renderPage({ data: undefined, isLoading: true });

    expect(screen.getByText('Đang tải danh sách chờ duyệt...')).toBeInTheDocument();
  });

  it('lỗi → hiện ErrorState với nút Thử lại (CRE-008)', () => {
    renderPage({ data: undefined, isError: true });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('chọn tab trạng thái → useReviewQueue gọi với filter mới, page reset về 1 (CRE-008)', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Đã duyệt' }));

    expect(mockUseReviewQueue).toHaveBeenCalledWith({ status: 'verified', page: 1, limit: 12 });
  });

  it('nút Xem chi tiết hiện trên row ở MỌI trạng thái (CRE-008)', () => {
    const statuses: CreatorStatus[] = [
      'pending_review',
      'info_required',
      'rejected',
      'verified',
      'suspended',
    ];
    statuses.forEach((item) => {
      const fixture: CreatorAdmin = { ...adminFixture, displayName: `Creator ${item}`, status: item };
      renderPage({ data: envelopeFixture([fixture]) });

      const row = getRow(`Creator ${item}`);
      expect(within(row).getByRole('button', { name: 'Xem chi tiết' })).toBeInTheDocument();
    });
  });

  it('click Xem chi tiết → modal mở, hiển thị displayName, userEmail, bio, city, niches (CRE-008)', () => {
    renderPage();
    fireEvent.click(within(getRow('Creator Demo')).getByRole('button', { name: 'Xem chi tiết' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Creator Demo')).toBeInTheDocument();
    expect(within(dialog).getByText('creator@demo.vn')).toBeInTheDocument();
    expect(within(dialog).getByText('Creator chuyên review ẩm thực.')).toBeInTheDocument();
    expect(within(dialog).getByText('Hà Nội')).toBeInTheDocument();
    expect(within(dialog).getByText('f&b')).toBeInTheDocument();
  });

  it('click Đóng → modal biến mất (CRE-008)', () => {
    renderPage();
    fireEvent.click(within(getRow('Creator Demo')).getByRole('button', { name: 'Xem chi tiết' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Nút đóng = nút "Đóng" ở footer (nút × ở header cũng có accessible name "Đóng").
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Đóng' })[1]);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creator có portfolio + social + statusReason → modal hiển thị đủ các field (CRE-008)', () => {
    const richFixture: CreatorAdmin = {
      ...adminFixture,
      status: 'rejected',
      statusReason: 'Thiếu giấy tờ xác minh',
      portfolioItems: [
        {
          id: 'item_0001',
          type: 'link',
          url: 'https://example.com/bai-viet',
          caption: 'Link bài viết',
          category: 'food',
          thumbnailUrl: null,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    };
    renderPage({ data: envelopeFixture([richFixture]) });
    fireEvent.click(within(getRow('Creator Demo')).getByRole('button', { name: 'Xem chi tiết' }));

    const dialog = screen.getByRole('dialog');
    // statusReason nằm sau <strong>Lý do:</strong> → getNodeText tách thành 2 node, assert từng phần.
    expect(within(dialog).getByText('Lý do:')).toBeInTheDocument();
    expect(within(dialog).getByText('Thiếu giấy tờ xác minh')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'example.com' })).toBeInTheDocument();
    expect(within(dialog).getByText('Link bài viết')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'tiktok: @demo' })).toBeInTheDocument();
    expect(within(dialog).getByText('1.2K follower')).toBeInTheDocument();
  });
});
