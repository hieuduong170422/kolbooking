import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrandReviewQueue, useReviewBrand } from '../features/brands/hooks/use-brand-profile';
import type { BrandAdmin } from '../features/brands/types/brand-types';
import { AdminBrandsPage } from './admin-brands-page';

vi.mock('../features/brands/hooks/use-brand-profile', () => ({
  useBrandReviewQueue: vi.fn(),
  useReviewBrand: vi.fn(),
}));

const mockUseQueue = vi.mocked(useBrandReviewQueue);
const mockUseReview = vi.mocked(useReviewBrand);

const brandFixture: BrandAdmin = {
  id: 'brd_1',
  name: 'The Morning Cafe',
  logoUrl: null,
  industry: 'f&b',
  website: null,
  socialLinks: [],
  businessAddress: '12 Phố Hàng Bông, Hà Nội',
  entityType: 'household',
  status: 'pending_review',
  statusReason: null,
  verificationDocs: [
    { id: 'doc_1', fileName: 'giay-phep.png', storageKey: '', uploadedAt: '2026-08-05T00:00:00.000Z' },
  ],
  contact: { name: 'Trần Thu Hà', email: 'ha@cafe.vn', phone: '0912345678' },
  createdAt: '2026-08-01T00:00:00.000Z',
  userEmail: 'brand@demo.vn',
};

const mutateMock = vi.fn();

describe('AdminBrandsPage (BRD-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueue.mockReturnValue({
      data: {
        success: true,
        data: [brandFixture],
        error: null,
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    mockUseReview.mockReturnValue({ mutate: mutateMock } as never);
  });

  it('hiển thị brand chờ duyệt với email + giấy tờ + liên hệ', () => {
    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('The Morning Cafe')).toBeInTheDocument();
    expect(screen.getByText(/brand@demo.vn/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'giay-phep.png' })).toBeInTheDocument();
    expect(screen.getByText('Hộ kinh doanh')).toBeInTheDocument();
  });

  it('bấm Duyệt gọi mutation approve', () => {
    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    expect(mutateMock).toHaveBeenCalledWith({ brandId: 'brd_1', action: 'approve' });
  });

  it('Từ chối mở modal bắt buộc lý do trước khi xác nhận', () => {
    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Lý do/), {
      target: { value: 'Thiếu giấy phép kinh doanh hợp lệ.' },
    });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    expect(mutateMock).toHaveBeenCalledWith({
      brandId: 'brd_1',
      action: 'reject',
      reason: 'Thiếu giấy phép kinh doanh hợp lệ.',
    });
  });
});
