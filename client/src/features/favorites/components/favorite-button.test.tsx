import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../auth/store/auth-context';
import type { AuthRole } from '../../auth/types/auth-types';
import { useFavorites, useToggleFavorite } from '../hooks/use-favorites';
import { FavoriteButton } from './favorite-button';

vi.mock('../hooks/use-favorites', () => ({
  useFavorites: vi.fn(),
  useToggleFavorite: vi.fn(),
}));

const mockUseFavorites = vi.mocked(useFavorites);
const mockUseToggle = vi.mocked(useToggleFavorite);
const mutate = vi.fn();

const withAuth = (role: AuthRole | null, children: ReactNode): ReactNode => {
  if (role === null) return children;
  const value = {
    status: 'authenticated',
    user: {
      id: 'usr_1',
      email: 'brand@demo.vn',
      displayName: 'Brand Demo',
      role,
      emailVerified: true,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  } as unknown as AuthContextValue;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

describe('FavoriteButton (BRD-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFavorites.mockReturnValue({ data: [] } as never);
    mockUseToggle.mockReturnValue({ mutate, isPending: false } as never);
  });

  it('không render khi chưa đăng nhập (không có AuthProvider)', () => {
    render(<>{withAuth(null, <FavoriteButton creatorId="crt_1" />)}</>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('không render với tài khoản creator — chỉ brand mới lưu được', () => {
    render(<>{withAuth('creator', <FavoriteButton creatorId="crt_1" />)}</>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('brand chưa lưu → bấm gọi mutate với saved=false', () => {
    render(<>{withAuth('brand', <FavoriteButton creatorId="crt_1" />)}</>);

    const button = screen.getByRole('button', { name: 'Lưu creator' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(mutate).toHaveBeenCalledWith({ creatorId: 'crt_1', saved: false });
  });

  it('creator đã lưu → nút ở trạng thái bật, bấm để bỏ lưu', () => {
    mockUseFavorites.mockReturnValue({ data: [{ id: 'crt_1' }] } as never);
    render(<>{withAuth('brand', <FavoriteButton creatorId="crt_1" />)}</>);

    const button = screen.getByRole('button', { name: 'Bỏ lưu creator' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(mutate).toHaveBeenCalledWith({ creatorId: 'crt_1', saved: true });
  });
});
