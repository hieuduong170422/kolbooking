import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../features/auth/store/use-auth';
import { NotFoundPage } from './not-found-page';

vi.mock('../features/auth/store/use-auth', () => ({ useAuth: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);

const mockAuth = (status: 'authenticated' | 'guest'): void => {
  mockUseAuth.mockReturnValue({
    status,
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  } as never);
};

const renderPage = (): void => {
  render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
};

describe('NotFoundPage — lối ra thay vì ngõ cụt', () => {
  beforeEach(() => vi.clearAllMocks());

  it('khách chưa đăng nhập: gợi ý đăng nhập', () => {
    mockAuth('guest');
    renderPage();

    expect(screen.getByRole('link', { name: 'Khám phá creator' })).toHaveAttribute(
      'href',
      '/creators',
    );
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/');
  });

  it('đã đăng nhập: đưa về dashboard chứ không mời đăng nhập lại', () => {
    mockAuth('authenticated');
    renderPage();

    expect(screen.getByRole('link', { name: 'Về dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  });
});
