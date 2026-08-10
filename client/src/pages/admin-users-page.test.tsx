import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserActions, useUsers } from '../features/admin/hooks/use-admin';
import type { AdminUser } from '../features/admin/types/admin-types';
import { AdminUsersPage } from './admin-users-page';

vi.mock('../features/admin/hooks/use-admin', () => ({
  useUsers: vi.fn(),
  useUserActions: vi.fn(),
}));

const mockUseUsers = vi.mocked(useUsers);
const mockUseUserActions = vi.mocked(useUserActions);

const makeUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 'usr_1',
  email: 'creator@demo.vn',
  displayName: 'Creator Demo',
  role: 'creator',
  status: 'active',
  emailVerified: true,
  consentVersion: '2026-08-mvp',
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const lockMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
const unlockMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

const setup = (users: readonly AdminUser[]): void => {
  mockUseUsers.mockReturnValue({
    data: {
      success: true,
      data: users,
      error: null,
      meta: { page: 1, limit: 20, total: users.length, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  mockUseUserActions.mockReturnValue({ lock: lockMutation, unlock: unlockMutation } as never);
  render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>,
  );
};

describe('AdminUsersPage (ADM-002, ADM-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị tài khoản kèm email, vai trò và trạng thái', () => {
    setup([makeUser()]);

    // Query trong bảng — nhãn vai trò/trạng thái cũng xuất hiện ở <option> bộ lọc.
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Creator Demo')).toBeInTheDocument();
    expect(table.getByText('creator@demo.vn')).toBeInTheDocument();
    expect(table.getByText('Creator')).toBeInTheDocument();
    expect(table.getByText('Đang hoạt động')).toBeInTheDocument();
  });

  it('tài khoản chưa xác minh email được đánh dấu riêng', () => {
    setup([makeUser({ emailVerified: false })]);
    expect(screen.getByText('Chưa xác minh email')).toBeInTheDocument();
  });

  it('khóa tài khoản: modal bắt buộc lý do ≥5 ký tự rồi mới gọi mutation', async () => {
    setup([makeUser()]);

    fireEvent.click(screen.getByRole('button', { name: 'Khóa' }));
    const confirm = screen.getByRole('button', { name: 'Xác nhận khóa' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Lý do khóa/), {
      target: { value: 'Spam brand nhiều lần.' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(lockMutation.mutateAsync).toHaveBeenCalledWith({
        userId: 'usr_1',
        reason: 'Spam brand nhiều lần.',
      });
    });
  });

  it('tài khoản đã khóa hiện nút Mở khóa và gọi đúng mutation', () => {
    setup([makeUser({ status: 'locked' })]);

    expect(within(screen.getByRole('table')).getByText('Đã khóa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở khóa' }));
    expect(unlockMutation.mutateAsync).toHaveBeenCalledWith('usr_1');
  });

  it('tài khoản admin không có nút khóa (chặn tự khóa mất quyền vận hành)', () => {
    setup([makeUser({ id: 'usr_2', role: 'admin', displayName: 'Admin Demo' })]);

    expect(screen.getByText('Tài khoản quản trị')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Khóa' })).not.toBeInTheDocument();
  });

  it('tìm kiếm submit form → truyền search vào hook', () => {
    setup([makeUser()]);

    fireEvent.change(screen.getByLabelText('Tìm tài khoản'), { target: { value: 'brand@demo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }));

    expect(mockUseUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'brand@demo', page: 1 }),
    );
  });
});
