import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCreatorProfile,
  usePortfolioActions,
  useSubmitProfileForReview,
  useUpdateAvailability,
  useUpdateCreatorProfile,
  useUploadAvatar,
} from '../features/creators/hooks/use-creator-profile';
import type { CreatorOwner, CreatorProfileInput } from '../features/creators/types/creator-types';
import { ApiClientError } from '../shared/api/api-types';
import { OnboardingPage } from './onboarding-page';

// Mock toàn bộ hooks module — page + form chỉ điều khiển qua hook đã mock,
// không gọi HTTP thật (pattern giống use-creator-profile.test.tsx — CRE-001..006).
vi.mock('../features/creators/hooks/use-creator-profile', () => ({
  useCreatorProfile: vi.fn(),
  useUpdateCreatorProfile: vi.fn(),
  useSubmitProfileForReview: vi.fn(),
  useUpdateAvailability: vi.fn(),
  useUploadAvatar: vi.fn(),
  usePortfolioActions: vi.fn(),
}));

const mockUseCreatorProfile = vi.mocked(useCreatorProfile);
const mockUpdateProfile = vi.mocked(useUpdateCreatorProfile);
const mockSubmitReview = vi.mocked(useSubmitProfileForReview);
const mockUpdateAvailability = vi.mocked(useUpdateAvailability);
const mockUploadAvatar = vi.mocked(useUploadAvatar);
const mockPortfolioActions = vi.mocked(usePortfolioActions);

// Fixture 19 trường CreatorOwner — copy từ use-creator-profile.test.tsx (CRE-001).
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

// Mutation mock — cấu trúc tối thiểu của useMutation mà form đọc tới.
// Cast qua `as never` vì UseMutationResult có nhiều field nội bộ (client TS non-strict).
const makeMutation = (overrides: Record<string, unknown> = {}) => ({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
  ...overrides,
});

let updateProfileMutation: ReturnType<typeof makeMutation>;
let submitReviewMutation: ReturnType<typeof makeMutation>;

// Render page với trạng thái hook: profile null → 404 (tạo mới), profile có → chỉnh sửa.
const renderPage = (profile: CreatorOwner | null = null, isLoading = false): void => {
  mockUseCreatorProfile.mockReturnValue({
    data: profile,
    isLoading,
    isError: profile === null && !isLoading,
    error:
      profile === null && !isLoading
        ? new ApiClientError('PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ.', 404)
        : null,
  } as never);
  render(<OnboardingPage />);
};

// Điền đủ field bắt buộc (displayName, bio, city, niches ≥1) để nút submit bật lên.
const fillRequiredFields = (): void => {
  fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Creator Demo' } });
  fireEvent.change(screen.getByLabelText('Giới thiệu'), {
    target: { value: 'Creator chuyên review ẩm thực.' },
  });
  fireEvent.change(screen.getByLabelText('Thành phố'), { target: { value: 'Hà Nội' } });
  fireEvent.change(screen.getByLabelText('Lĩnh vực (niche)'), { target: { value: 'ẩm thực' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm lĩnh vực' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  updateProfileMutation = makeMutation();
  submitReviewMutation = makeMutation();
  mockUpdateProfile.mockReturnValue(updateProfileMutation as never);
  mockSubmitReview.mockReturnValue(submitReviewMutation as never);
  mockUpdateAvailability.mockReturnValue(makeMutation() as never);
  mockUploadAvatar.mockReturnValue(makeMutation() as never);
  mockPortfolioActions.mockReturnValue({
    upload: makeMutation(),
    addLink: makeMutation(),
    remove: makeMutation(),
  } as never);
});

describe('OnboardingPage (CRE-001..006)', () => {
  it('đang tải → hiện LoadingState (CRE-001)', () => {
    renderPage(null, true);

    expect(screen.getByText('Đang tải hồ sơ...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu hồ sơ' })).not.toBeInTheDocument();
  });

  it('chưa có hồ sơ (404) → render form tạo mới, nút Lưu bị disable (CRE-001)', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Hồ sơ creator' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tên hiển thị')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu hồ sơ' })).toBeDisabled();
  });

  it('có hồ sơ → form prefill + hiển thị badge trạng thái (CRE-001..006)', () => {
    renderPage({
      ...ownerFixture,
      socialAccounts: [
        {
          platform: 'tiktok',
          handle: '@demo',
          url: 'https://www.tiktok.com/@demo',
          followerCount: 1200,
          isVerified: false,
        },
      ],
    });

    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Creator Demo');
    expect(screen.getByLabelText('Thành phố')).toHaveValue('Hà Nội');
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();
    expect(screen.getByText('f&b')).toBeInTheDocument();
    expect(screen.getByDisplayValue('@demo')).toBeInTheDocument();
  });

  it('điền đủ thông tin → Lưu hồ sơ gọi updateCreatorProfile với input đúng (CRE-001..006)', async () => {
    renderPage();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

    await waitFor(() => {
      expect(updateProfileMutation.mutate).toHaveBeenCalledTimes(1);
    });
    const input = updateProfileMutation.mutate.mock.calls[0]?.[0] as CreatorProfileInput;
    expect(input.displayName).toBe('Creator Demo');
    expect(input.bio).toBe('Creator chuyên review ẩm thực.');
    expect(input.city).toBe('Hà Nội');
    expect(input.niches).toEqual(['ẩm thực']);
    expect(input.creatorType).toBe('influencer');
    expect(input.language).toBe('vi');
    expect(input.socialAccounts).toEqual([]);
    expect(input.audienceMetrics?.isSelfReported).toBe(true);
    expect(input.audienceMetrics?.followerCount).toBe(0);
    expect(input.serviceMode).toBe('both');
  });

  it('Gửi duyệt disabled khi hồ sơ chưa đủ, gọi submitProfileForReview khi đủ (CRE-007)', async () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Gửi duyệt' })).toBeDisabled();

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi duyệt' }));

    await waitFor(() => {
      expect(submitReviewMutation.mutate).toHaveBeenCalledTimes(1);
    });
  });

  it('disable Lưu hồ sơ khi thiếu một trong displayName/bio/city/niches (CRE-001..006)', () => {
    renderPage();
    const saveButton = screen.getByRole('button', { name: 'Lưu hồ sơ' });

    // Điền 3 field nhưng chưa có niche → vẫn disabled.
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Creator Demo' } });
    fireEvent.change(screen.getByLabelText('Giới thiệu'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('Thành phố'), { target: { value: 'Hà Nội' } });
    expect(saveButton).toBeDisabled();

    // Thêm niche → bật lên.
    fireEvent.change(screen.getByLabelText('Lĩnh vực (niche)'), { target: { value: 'ẩm thực' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lĩnh vực' }));
    expect(saveButton).toBeEnabled();
  });

  it('status pending_review → form bị khóa (fields + submit disabled) + note (CRE-001..006)', () => {
    renderPage({ ...ownerFixture, status: 'pending_review' });

    expect(screen.getByLabelText('Tên hiển thị')).toBeDisabled();
    expect(screen.getByLabelText('Giới thiệu')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lưu hồ sơ' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi duyệt' })).toBeDisabled();
    expect(screen.getByText(/không thể chỉnh sửa/)).toBeInTheDocument();
  });

  it('status suspended → form bị khóa (CRE-001..006)', () => {
    renderPage({ ...ownerFixture, status: 'suspended' });

    expect(screen.getByLabelText('Tên hiển thị')).toBeDisabled();
    expect(screen.getByText(/không thể chỉnh sửa/)).toBeInTheDocument();
  });

  it('status verified → hiện cảnh báo chỉnh sửa về chờ duyệt nhưng vẫn cho sửa (CRE-001..006)', () => {
    renderPage({ ...ownerFixture, status: 'verified' });

    expect(
      screen.getByText('Chỉnh sửa sẽ đưa hồ sơ về trạng thái chờ duyệt.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Tên hiển thị')).toBeEnabled();
  });
});
