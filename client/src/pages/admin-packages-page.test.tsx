import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAdminPackages,
  usePackageModeration,
} from '../features/packages/hooks/use-my-packages';
import type { PackageAdmin } from '../features/packages/types/package-types';
import { AdminPackagesPage } from './admin-packages-page';

vi.mock('../features/packages/hooks/use-my-packages', () => ({
  useAdminPackages: vi.fn(),
  usePackageModeration: vi.fn(),
}));

const mockUseAdminPackages = vi.mocked(useAdminPackages);
const mockUseModeration = vi.mocked(usePackageModeration);

const hideMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
const unhideMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

const makePackage = (overrides: Partial<PackageAdmin> = {}): PackageAdmin => ({
  id: 'pkg_1',
  creatorId: 'crt_1',
  creatorName: 'Lan Chi Foodie',
  name: 'Video review quán',
  category: 'f&b',
  platforms: ['tiktok'],
  description: 'Một video review 30-60s.',
  coverImageUrl: null,
  deliverables: [],
  priceVnd: 1_500_000,
  turnaroundDays: 5,
  revisionsIncluded: 1,
  usageRights: { repost: true, paidAds: false, durationMonths: 3, channels: [] },
  postDurationDays: null,
  addOns: [],
  status: 'published',
  statusReason: null,
  version: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const setup = (packages: readonly PackageAdmin[]): void => {
  mockUseAdminPackages.mockReturnValue({
    data: {
      success: true,
      data: packages,
      error: null,
      meta: { page: 1, limit: 20, total: packages.length, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  mockUseModeration.mockReturnValue({ hide: hideMutation, unhide: unhideMutation } as never);
  render(
    <MemoryRouter>
      <AdminPackagesPage />
    </MemoryRouter>,
  );
};

describe('AdminPackagesPage (PKG-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị package kèm tên creator, giá và trạng thái', () => {
    setup([makePackage()]);

    const table = within(screen.getByRole('table'));
    expect(table.getByText('Video review quán')).toBeInTheDocument();
    expect(table.getByRole('link', { name: 'Lan Chi Foodie' })).toHaveAttribute(
      'href',
      '/creators/crt_1',
    );
    expect(table.getByText(/1\.500\.000/)).toBeInTheDocument();
    expect(table.getByText('Đang bán')).toBeInTheDocument();
  });

  it('ẩn package: modal bắt buộc lý do ≥5 ký tự rồi mới gọi mutation', async () => {
    setup([makePackage()]);

    fireEvent.click(screen.getByRole('button', { name: 'Ẩn' }));
    const confirm = screen.getByRole('button', { name: 'Xác nhận ẩn' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Lý do ẩn/), {
      target: { value: 'Nội dung sai lệch giá niêm yết.' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(hideMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'pkg_1',
        reason: 'Nội dung sai lệch giá niêm yết.',
      });
    });
  });

  it('package đã ẩn hiện lý do và nút khôi phục', () => {
    setup([makePackage({ status: 'hidden', statusReason: 'Vi phạm chính sách nội dung.' })]);

    expect(screen.getByText('Vi phạm chính sách nội dung.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Khôi phục' }));
    expect(unhideMutation.mutateAsync).toHaveBeenCalledWith('pkg_1');
  });
});
