import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreators } from '../features/creators/hooks/use-creators';
import type { Creator } from '../features/creators/types/creator-types';
import { CreatorsPage } from './creators-page';

// Mock hook danh sách creator — page render từ data fixture, không gọi HTTP (SRCH-003).
vi.mock('../features/creators/hooks/use-creators', () => ({
  useCreators: vi.fn(),
}));

const mockUseCreators = vi.mocked(useCreators);

const creatorFixture: Creator = {
  id: 'crt_0001',
  displayName: 'Minh Thu UGC',
  avatarUrl: null,
  bio: 'UGC creator tại Hồ Chí Minh.',
  city: 'Hồ Chí Minh',
  niches: ['beauty'],
  language: 'vi',
  creatorType: 'ugc',
  socialAccounts: [],
  audienceMetrics: null,
  serviceMode: 'online',
  portfolioItems: [],
  priceFromVnd: 500000,
  rating: 4.5,
  completedBookings: 3,
};

const metaFixture = { page: 1, limit: 12, total: 1, totalPages: 1 };

const renderPage = (initialEntry = '/creators'): void => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/creators" element={<CreatorsPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('CreatorsPage (SRCH-003)', () => {
  beforeEach(() => {
    mockUseCreators.mockReturnValue({
      data: { data: [creatorFixture], meta: metaFixture },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it('đọc city từ URL vào filter rồi truyền xuống useCreators (SRCH-003)', () => {
    renderPage('/creators?city=H%E1%BB%93%20Ch%C3%AD%20Minh');

    expect(mockUseCreators).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Hồ Chí Minh' }),
    );
  });

  it('chọn thành phố trong filter → cập nhật URL có city (SRCH-003)', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Thành phố'), { target: { value: 'Hà Nội' } });

    expect(screen.getByLabelText('Thành phố')).toHaveValue('Hà Nội');
    // searchParamsFromFilter ghi city lên URL — shareable link (SRCH-003)
    expect(mockUseCreators).toHaveBeenLastCalledWith(
      expect.objectContaining({ city: 'Hà Nội', page: 1 }),
    );
  });

  it('xóa city khỏi URL khi chọn "Tất cả thành phố" (SRCH-003)', () => {
    renderPage('/creators?city=H%C3%A0%20N%E1%BB%99i');

    fireEvent.change(screen.getByLabelText('Thành phố'), { target: { value: '' } });

    expect(screen.getByLabelText('Thành phố')).toHaveValue('');
    expect(mockUseCreators).toHaveBeenLastCalledWith(
      expect.objectContaining({ city: undefined, page: 1 }),
    );
  });
});
