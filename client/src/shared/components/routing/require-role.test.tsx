import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../../features/auth/store/use-auth';
import type { AuthUser } from '../../../features/auth/types/auth-types';
import { RequireRole } from './require-role';

// Mock store auth để điều khiển trạng thái user/vai trò từng test.
vi.mock('../../../features/auth/store/use-auth', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

const makeUser = (role: AuthUser['role']): AuthUser => ({
  id: 'usr_1',
  email: 'user@demo.vn',
  displayName: 'User Demo',
  role,
  emailVerified: true,
  createdAt: '2026-08-01T00:00:00.000Z',
});

// Render RequireRole tại route gốc, kèm 2 route đích để xác minh redirect
// thực tế (Navigate thay đổi location → nội dung route đích xuất hiện).
const renderAtRoot = (children: ReactNode): void => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={<RequireRole role="creator">{children}</RequireRole>}
        />
        <Route path="/dashboard" element={<div>Trang dashboard</div>} />
        <Route path="/login" element={<div>Trang đăng nhập</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('RequireRole', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: makeUser('creator'),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
  });

  it('render children khi user có đúng vai trò (AUTH-005)', () => {
    renderAtRoot(<p>Nội dung riêng của creator</p>);

    expect(screen.getByText('Nội dung riêng của creator')).toBeInTheDocument();
  });

  it('chuyển về /dashboard khi user sai vai trò (AUTH-005)', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: makeUser('admin'),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderAtRoot(<p>Nội dung riêng của creator</p>);

    expect(screen.getByText('Trang dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Nội dung riêng của creator')).not.toBeInTheDocument();
  });

  it('chuyển về /login khi chưa đăng nhập (AUTH-005)', () => {
    mockUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderAtRoot(<p>Nội dung riêng của creator</p>);

    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument();
  });
});
