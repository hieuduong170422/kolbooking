import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMyPackages, usePackageActions } from '../features/packages/hooks/use-my-packages';
import { useCreatorProfile } from '../features/creators/hooks/use-creator-profile';
import type { PackageOwner } from '../features/packages/types/package-types';
import { ApiClientError } from '../shared/api/api-types';
import { MyPackagesPage } from './my-packages-page';

vi.mock('../features/packages/hooks/use-my-packages', () => ({
  useMyPackages: vi.fn(),
  usePackageActions: vi.fn(),
}));
vi.mock('../features/creators/hooks/use-creator-profile', () => ({ useCreatorProfile: vi.fn() }));

const mockUseMyPackages = vi.mocked(useMyPackages);
const mockUsePackageActions = vi.mocked(usePackageActions);
const mockUseCreatorProfile = vi.mocked(useCreatorProfile);

const packageFixture: PackageOwner = {
  id: 'pkg_1',
  creatorId: 'crt_1',
  name: 'Video review quán',
  category: 'f&b',
  platforms: ['tiktok'],
  description: 'Một video review 30-60s quay dọc tại quán.',
  coverImageUrl: null,
  deliverables: [
    { type: 'video', quantity: 1, description: 'Video 30-60s', postedOnCreatorChannel: true },
  ],
  priceVnd: 1_500_000,
  turnaroundDays: 5,
  revisionsIncluded: 1,
  usageRights: { repost: true, paidAds: false, durationMonths: 3, channels: ['facebook'] },
  postDurationDays: 90,
  addOns: [],
  status: 'draft',
  statusReason: null,
  version: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const mutationMock = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

const setupMocks = ({
  packages = [packageFixture],
  profileStatus = 'verified',
  queryError = null,
}: {
  packages?: readonly PackageOwner[];
  profileStatus?: string;
  queryError?: unknown;
} = {}): void => {
  mockUseMyPackages.mockReturnValue({
    data: queryError === null ? packages : undefined,
    isLoading: false,
    isError: queryError !== null,
    error: queryError,
    refetch: vi.fn(),
  } as never);
  mockUsePackageActions.mockReturnValue({
    create: mutationMock,
    update: mutationMock,
    publish: mutationMock,
    unpublish: mutationMock,
    removeDraft: mutationMock,
  } as never);
  mockUseCreatorProfile.mockReturnValue({ data: { status: profileStatus } } as never);
};

const renderPage = (): void => {
  render(
    <MemoryRouter>
      <MyPackagesPage />
    </MemoryRouter>,
  );
};

describe('MyPackagesPage (PKG-001, PKG-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị danh sách package với badge trạng thái + giá VND', () => {
    setupMocks();
    renderPage();

    expect(screen.getByText('Video review quán')).toBeInTheDocument();
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('creator chưa verified → nút Publish disable + cảnh báo BR-001', () => {
    setupMocks({ profileStatus: 'draft' });
    renderPage();

    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText(/BR-001/)).toBeInTheDocument();
  });

  it('package hidden hiển thị lý do ẩn, không có nút Sửa/Publish', () => {
    setupMocks({
      packages: [
        { ...packageFixture, status: 'hidden', statusReason: 'Vi phạm chính sách nội dung.' },
      ],
    });
    renderPage();

    expect(screen.getByText(/Vi phạm chính sách/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('chưa có hồ sơ creator (PROFILE_NOT_FOUND) → CTA sang onboarding', () => {
    setupMocks({ queryError: new ApiClientError('PROFILE_NOT_FOUND', 'Chưa có hồ sơ.', 404) });
    renderPage();

    expect(screen.getByText('Chưa có hồ sơ creator')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tạo hồ sơ ngay' })).toHaveAttribute(
      'href',
      '/onboarding',
    );
  });
});
