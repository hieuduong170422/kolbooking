import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreator } from '../features/creators/hooks/use-creator';
import type { Creator } from '../features/creators/types/creator-types';
import { CreatorDetailPage } from './creator-detail-page';

// Mock hook chi tiết creator — page render từ data fixture, không gọi HTTP (SRCH-005).
vi.mock('../features/creators/hooks/use-creator', () => ({
  useCreator: vi.fn(),
}));
// Mock hook package public — section "Gói dịch vụ" hiển thị empty state trong test.
vi.mock('../features/packages/hooks/use-public-packages', () => ({
  usePackagesByCreator: vi.fn().mockReturnValue({
    data: { success: true, data: [], error: null },
    isPending: false,
    isError: false,
  }),
}));

const mockUseCreator = vi.mocked(useCreator);

/** Creator công khai 15 trường — fixture theo creator-card.test + portfolio/metrics (CRE-009). */
const publicCreator: Creator = {
  id: 'crt_0001',
  displayName: 'Lan Chi Foodie',
  avatarUrl: '/uploads/avatar.jpg',
  bio: 'Food reviewer Hà Nội.',
  city: 'Hà Nội',
  niches: ['f&b', 'cafe'],
  language: 'vi',
  creatorType: 'koc',
  socialAccounts: [
    {
      platform: 'tiktok',
      handle: '@lanchifoodie',
      url: 'https://www.tiktok.com/@lanchifoodie',
      followerCount: 48000,
      isVerified: true,
    },
  ],
  audienceMetrics: {
    followerCount: 52000,
    viewCount: 1200000,
    updatedAt: '2026-08-01T00:00:00.000Z',
    isSelfReported: true,
  },
  serviceMode: 'both',
  portfolioItems: [
    {
      id: 'item_1',
      type: 'image',
      url: '/uploads/p1.jpg',
      caption: 'Review phở Hà Nội',
      category: 'f&b',
      thumbnailUrl: '/uploads/p1-thumb.jpg',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'item_2',
      type: 'link',
      url: 'https://example.com/demo',
      caption: 'Link bài viết',
      category: null,
      thumbnailUrl: null,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  priceFromVnd: 1500000,
  rating: 4.8,
  completedBookings: 32,
};

const renderPage = (): void => {
  render(
    <MemoryRouter initialEntries={['/creators/crt_0001']}>
      <Routes>
        <Route path="/creators/:id" element={<CreatorDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('CreatorDetailPage (SRCH-005)', () => {
  beforeEach(() => {
    mockUseCreator.mockReturnValue({
      data: publicCreator,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it('hiển thị avatar, serviceMode, ngôn ngữ, metrics "tự khai báo" và portfolio (SRCH-005)', () => {
    renderPage();

    // Avatar (CRE-001)
    expect(screen.getByRole('img', { name: 'Ảnh đại diện Lan Chi Foodie' })).toHaveAttribute(
      'src',
      '/uploads/avatar.jpg',
    );

    // Service mode (CRE-006) + ngôn ngữ (CRE-001) — trong dòng meta nên match substring
    // Xuất hiện ở dòng meta VÀ panel booking → dùng getAllByText.
    expect(screen.getAllByText(/Online & Offline/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Tiếng Việt/)).toBeInTheDocument();

    // Portfolio — image có caption + link hiện tên miền với caption (CRE-004, SRCH-005)
    expect(screen.getByText('Review phở Hà Nội')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'example.com' })).toHaveAttribute(
      'href',
      'https://example.com/demo',
    );
    expect(screen.getByText('Link bài viết')).toBeInTheDocument();

    // Audience metrics + nhãn tự khai báo (CRE-005)
    expect(screen.getByText(/52K/)).toBeInTheDocument();
    expect(screen.getByText(/1\.2M/)).toBeInTheDocument();
    expect(screen.getByText(/tự khai báo/i)).toBeInTheDocument();
  });

  it('portfolio rỗng + metrics null → render nhánh trống không crash (SRCH-005)', () => {
    mockUseCreator.mockReturnValue({
      data: { ...publicCreator, portfolioItems: [], audienceMetrics: null, avatarUrl: null },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(screen.getByText('Chưa có portfolio.')).toBeInTheDocument();
    expect(screen.getByText('Chưa khai báo.')).toBeInTheDocument();
  });

  it('isPending → hiển thị trạng thái đang tải (SRCH-005)', () => {
    mockUseCreator.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(screen.getByText('Đang tải hồ sơ creator...')).toBeInTheDocument();
  });

  it('isError → hiển thị lỗi + nút thử lại (SRCH-005)', () => {
    mockUseCreator.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Không tìm thấy creator.'),
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(screen.getByText('Không tìm thấy creator.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
  });

  it('KHÔNG hiển thị status/statusReason/email/phone/availability — CRE-009', () => {
    renderPage();

    expect(screen.queryByText(/Đang chờ duyệt|Bản nháp|Bị từ chối|Tạm khóa/)).not.toBeInTheDocument();
    expect(screen.queryByText(/creator@demo\.vn/)).not.toBeInTheDocument();
    expect(screen.queryByText(/090\d{6,}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/availability|isPaused/i)).not.toBeInTheDocument();
  });
});
