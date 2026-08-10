import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmEmailVerification,
  requestEmailVerification,
} from '../features/auth/api/auth-api';
import { useAuth } from '../features/auth/store/use-auth';
import type { AuthUser } from '../features/auth/types/auth-types';
import { VerifyEmailPage } from './verify-email-page';

vi.mock('../features/auth/store/use-auth', () => ({ useAuth: vi.fn() }));
vi.mock('../features/auth/api/auth-api', () => ({
  confirmEmailVerification: vi.fn(),
  requestEmailVerification: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockConfirm = vi.mocked(confirmEmailVerification);
const mockRequest = vi.mocked(requestEmailVerification);

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'usr_1',
  email: 'creator@test.vn',
  displayName: 'Creator Mới',
  role: 'creator',
  emailVerified: false,
  createdAt: '2026-08-10T00:00:00.000Z',
  ...overrides,
});

const updateUser = vi.fn();

const renderPage = (user: AuthUser): void => {
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    user,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser,
  });
  render(
    <MemoryRouter initialEntries={['/verify-email']}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/onboarding" element={<p>Trang onboarding</p>} />
        <Route path="/dashboard" element={<p>Trang dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('VerifyEmailPage (AUTH-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị email của user và nút xác minh disable khi mã chưa đủ 6 số', () => {
    renderPage(makeUser());

    expect(screen.getByText('creator@test.vn')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mã xác minh'), { target: { value: '123' } });
    expect(screen.getByRole('button', { name: 'Xác minh' })).toBeDisabled();
  });

  it('nhập đúng mã → gọi API, cập nhật user và chuyển creator sang onboarding', async () => {
    const verified = makeUser({ emailVerified: true });
    mockConfirm.mockResolvedValue(verified);
    renderPage(makeUser());

    fireEvent.change(screen.getByLabelText('Mã xác minh'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh' }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('123456');
      expect(updateUser).toHaveBeenCalledWith(verified);
    });
    expect(await screen.findByText('Trang onboarding')).toBeInTheDocument();
  });

  it('bấm gửi lại mã → gọi API request và báo đã gửi', async () => {
    mockRequest.mockResolvedValue(undefined);
    renderPage(makeUser());

    fireEvent.click(screen.getByRole('button', { name: 'Gửi lại mã' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });
    expect(await screen.findByText(/Đã gửi lại mã/)).toBeInTheDocument();
  });

  it('user đã xác minh → chuyển thẳng về dashboard', () => {
    renderPage(makeUser({ emailVerified: true }));

    expect(screen.getByText('Trang dashboard')).toBeInTheDocument();
  });
});
