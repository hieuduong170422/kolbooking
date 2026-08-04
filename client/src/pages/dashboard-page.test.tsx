import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../features/auth/store/use-auth';
import { useCreatorProfile } from '../features/creators/hooks/use-creator-profile';
import type { AuthUser } from '../features/auth/types/auth-types';
import type { CreatorOwner } from '../features/creators/types/creator-types';
import { ApiClientError } from '../shared/api/api-types';
import { DashboardPage } from './dashboard-page';

// Mock store auth + hook hồ sơ creator — page render từ trạng thái mock, không gọi HTTP (CRE-007).
vi.mock('../features/auth/store/use-auth', () => ({ useAuth: vi.fn() }));
vi.mock('../features/creators/hooks/use-creator-profile', () => ({ useCreatorProfile: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);
const mockUseCreatorProfile = vi.mocked(useCreatorProfile);

const makeUser = (role: AuthUser['role']): AuthUser => ({
  id: 'usr_1',
  email: 'user@demo.vn',
  displayName: 'User Demo',
  role,
  emailVerified: true,
  createdAt: '2026-08-01T00:00:00.000Z',
});

// Fixture 19 trường CreatorOwner — copy từ onboarding-page.test.tsx (CRE-001).
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

const renderDashboard = (): void => {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
};

describe('DashboardPage (CRE-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: makeUser('creator'),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('creator có hồ sơ → hiển thị card "Hồ sơ creator" + StatusBanner + link quản lý (CRE-007)', () => {
    mockUseCreatorProfile.mockReturnValue({
      data: ownerFixture,
      isPending: false,
      isError: false,
      error: null,
    } as never);
    renderDashboard();

    expect(screen.getByText('Hồ sơ creator')).toBeInTheDocument();
    expect(screen.getByText('Bản nháp — hoàn thiện và gửi duyệt')).toBeInTheDocument();
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quản lý hồ sơ/ })).toHaveAttribute(
      'href',
      '/onboarding',
    );
  });

  it('creator chưa có hồ sơ (404) → link "Tạo hồ sơ ngay" trỏ /onboarding (CRE-007)', () => {
    mockUseCreatorProfile.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiClientError('PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ.', 404),
    } as never);
    renderDashboard();

    expect(screen.getByRole('link', { name: 'Tạo hồ sơ ngay' })).toHaveAttribute(
      'href',
      '/onboarding',
    );
  });

  it('status rejected → StatusBanner hiển thị kèm statusReason (CRE-007)', () => {
    mockUseCreatorProfile.mockReturnValue({
      data: { ...ownerFixture, status: 'rejected', statusReason: 'Ảnh đại diện không hợp lệ.' },
      isPending: false,
      isError: false,
      error: null,
    } as never);
    renderDashboard();

    expect(screen.getByText('Bị từ chối: Ảnh đại diện không hợp lệ.')).toBeInTheDocument();
  });

  it('đang tải hồ sơ → hiển thị trạng thái đang tải (CRE-007)', () => {
    mockUseCreatorProfile.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as never);
    renderDashboard();

    expect(screen.getByText(/đang tải trạng thái/i)).toBeInTheDocument();
  });

  it('brand → không render card "Hồ sơ creator", không gọi useCreatorProfile (CRE-007)', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: makeUser('brand'),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    renderDashboard();

    expect(screen.queryByText('Hồ sơ creator')).not.toBeInTheDocument();
    expect(mockUseCreatorProfile).not.toHaveBeenCalled();
  });
});
