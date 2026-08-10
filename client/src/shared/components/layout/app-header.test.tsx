import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../../features/auth/store/use-auth';
import type { AuthUser } from '../../../features/auth/types/auth-types';
import { AppHeader } from './app-header';

// Mock store auth để điều khiển trạng thái đăng nhập từng test.
vi.mock('../../../features/auth/store/use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock useNavigate để assert hướng điều hướng sau khi logout (AUTH-006).
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.mocked(useAuth);

const makeUser = (role: AuthUser['role'] = 'creator'): AuthUser => ({
  id: 'usr_1',
  email: 'user@demo.vn',
  displayName: 'User Demo',
  role,
  emailVerified: true,
  createdAt: '2026-08-01T00:00:00.000Z',
});

// AppHeader dùng NavLink + useNavigate → cần MemoryRouter.
const renderHeader = (): void => {
  render(
    <MemoryRouter initialEntries={['/creators']}>
      <AppHeader />
    </MemoryRouter>,
  );
};

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: makeUser(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
  });

  it('hiển thị tên user, chưa có nút "Đăng xuất" trực tiếp khi menu đóng (AUTH-006)', () => {
    renderHeader();

    expect(screen.getByText('User Demo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Đăng xuất' })).not.toBeInTheDocument();
  });

  it('click vào tên user → dropdown menu mở, nút "Đăng xuất" hiện bên trong', () => {
    renderHeader();

    fireEvent.click(screen.getByText('User Demo'));

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('click tên user lần nữa → menu đóng (toggle)', () => {
    renderHeader();

    fireEvent.click(screen.getByText('User Demo'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByText('User Demo'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('click "Đăng xuất" trong menu → gọi logout rồi điều hướng về /creators (AUTH-006)', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: makeUser(),
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      updateUser: vi.fn(),
    });
    renderHeader();

    fireEvent.click(screen.getByText('User Demo'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/creators');
    });
  });

  it('click ra ngoài (mousedown document) → menu đóng', () => {
    renderHeader();

    fireEvent.click(screen.getByText('User Demo'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('bấm phím Escape → menu đóng', () => {
    renderHeader();

    fireEvent.click(screen.getByText('User Demo'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('chưa đăng nhập → hiển thị Đăng nhập/Đăng ký như cũ (AUTH-006 regression)', () => {
    mockUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
    renderHeader();

    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toBeInTheDocument();
    expect(screen.queryByText('User Demo')).not.toBeInTheDocument();
  });
});
