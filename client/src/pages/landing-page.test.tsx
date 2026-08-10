import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreators } from '../features/creators/hooks/use-creators';
import type { Creator } from '../features/creators/types/creator-types';
import { LandingPage } from './landing-page';

vi.mock('../features/creators/hooks/use-creators', () => ({ useCreators: vi.fn() }));

const mockUseCreators = vi.mocked(useCreators);

const creatorFixture: Creator = {
  id: 'crt_0001',
  displayName: 'Lan Chi Foodie',
  avatarUrl: null,
  bio: 'Food reviewer Hà Nội.',
  city: 'Hà Nội',
  niches: ['f&b'],
  language: 'vi',
  creatorType: 'koc',
  socialAccounts: [],
  audienceMetrics: null,
  serviceMode: 'both',
  portfolioItems: [],
  priceFromVnd: 1_500_000,
  rating: 4.8,
  completedBookings: 32,
};

const renderPage = (): void => {
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
};

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị hero với hai lối vào chính', () => {
    mockUseCreators.mockReturnValue({ data: undefined } as never);
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Đặt lịch creator/);
    expect(screen.getByRole('link', { name: 'Tìm creator' })).toHaveAttribute('href', '/creators');
    expect(screen.getByRole('link', { name: 'Đăng ký làm creator' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('giải thích 3 bước booking', () => {
    mockUseCreators.mockReturnValue({ data: undefined } as never);
    renderPage();

    expect(screen.getByText('Chọn gói dịch vụ')).toBeInTheDocument();
    expect(screen.getByText('Thanh toán được giữ lại')).toBeInTheDocument();
    expect(screen.getByText('Nghiệm thu rồi giải ngân')).toBeInTheDocument();
  });

  it('có creator nổi bật thì hiện lưới, không có thì ẩn hẳn mục đó', () => {
    mockUseCreators.mockReturnValue({
      data: { success: true, data: [creatorFixture], error: null },
    } as never);
    renderPage();
    expect(screen.getByText('Creator nổi bật')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lan Chi Foodie' })).toBeInTheDocument();

    vi.clearAllMocks();
    mockUseCreators.mockReturnValue({
      data: { success: true, data: [], error: null },
    } as never);
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.queryAllByText('Creator nổi bật')).toHaveLength(1);
  });
});
