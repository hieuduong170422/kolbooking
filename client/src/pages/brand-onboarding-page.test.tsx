import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrandActions, useBrandProfile } from '../features/brands/hooks/use-brand-profile';
import type { BrandOwner } from '../features/brands/types/brand-types';
import { ApiClientError } from '../shared/api/api-types';
import { BrandOnboardingPage } from './brand-onboarding-page';

vi.mock('../features/brands/hooks/use-brand-profile', () => ({
  useBrandProfile: vi.fn(),
  useBrandActions: vi.fn(),
}));

const mockUseBrandProfile = vi.mocked(useBrandProfile);
const mockUseBrandActions = vi.mocked(useBrandActions);

const brandFixture: BrandOwner = {
  id: 'brd_1',
  name: 'The Morning Cafe',
  logoUrl: null,
  industry: 'f&b',
  website: null,
  socialLinks: [],
  businessAddress: '12 Phố Hàng Bông, Hoàn Kiếm, Hà Nội',
  entityType: 'household',
  status: 'draft',
  statusReason: null,
  verificationDocs: [],
  contact: { name: 'Trần Thu Hà', email: 'ha@cafe.vn', phone: '0912345678' },
  createdAt: '2026-08-01T00:00:00.000Z',
};

const mutationMock = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

const setupMocks = (brand: BrandOwner | null): void => {
  mockUseBrandProfile.mockReturnValue({
    data: brand ?? undefined,
    isLoading: false,
    isError: brand === null,
    error: brand === null ? new ApiClientError('PROFILE_NOT_FOUND', 'Chưa có hồ sơ.', 404) : null,
    refetch: vi.fn(),
  } as never);
  mockUseBrandActions.mockReturnValue({
    update: mutationMock,
    uploadDoc: mutationMock,
    submit: mutationMock,
  } as never);
};

const renderPage = (): void => {
  render(
    <MemoryRouter>
      <BrandOnboardingPage />
    </MemoryRouter>,
  );
};

describe('BrandOnboardingPage (BRD-001..BRD-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chưa có hồ sơ → hiển thị form tạo mới, không có khối giấy tờ', () => {
    setupMocks(null);
    renderPage();

    expect(screen.getByRole('heading', { name: 'Tạo hồ sơ brand' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo hồ sơ brand' })).toBeInTheDocument();
    expect(screen.queryByText('Giấy tờ xác minh')).not.toBeInTheDocument();
  });

  it('hồ sơ draft chưa có giấy tờ → nút gửi duyệt disable', () => {
    setupMocks(brandFixture);
    renderPage();

    expect(screen.getByText(/Bản nháp/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi hồ sơ duyệt' })).toBeDisabled();
    expect(screen.getByText(/cần ít nhất một file/i)).toBeInTheDocument();
    // Ngay cạnh nút bị khóa phải nói rõ vì sao, nếu không người dùng tưởng
    // hỏng và hồ sơ nằm mãi ở Bản nháp, đội duyệt không bao giờ thấy.
    expect(screen.getByText(/rồi mới gửi duyệt được/i)).toBeInTheDocument();
  });

  it('có giấy tờ → nút gửi duyệt enable, danh sách file hiển thị', () => {
    setupMocks({
      ...brandFixture,
      verificationDocs: [
        {
          id: 'doc_1',
          fileName: 'giay-phep.png',
          storageKey: '',
          uploadedAt: '2026-08-05T00:00:00.000Z',
        },
      ],
    });
    renderPage();

    expect(screen.getByText('giay-phep.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi hồ sơ duyệt' })).toBeEnabled();
  });

  it('đang pending_review → form bị khóa, không có nút gửi duyệt', () => {
    setupMocks({ ...brandFixture, status: 'pending_review' });
    renderPage();

    expect(screen.getByText(/Đang chờ duyệt/)).toBeInTheDocument();
    expect(screen.getByText(/không thể chỉnh sửa/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi hồ sơ duyệt' })).not.toBeInTheDocument();
  });
});
