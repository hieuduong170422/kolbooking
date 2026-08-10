import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgotPassword, resetPassword } from '../features/auth/api/auth-api';
import { ForgotPasswordPage } from './forgot-password-page';

vi.mock('../features/auth/api/auth-api', () => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

const mockForgot = vi.mocked(forgotPassword);
const mockReset = vi.mocked(resetPassword);

const renderPage = (): void => {
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
};

describe('ForgotPasswordPage (AUTH-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bước 1: gửi email → gọi API và chuyển sang bước nhập mã', async () => {
    mockForgot.mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'brand@test.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã đặt lại' }));

    await waitFor(() => {
      expect(mockForgot).toHaveBeenCalledWith('brand@test.vn');
    });
    expect(await screen.findByLabelText('Mã xác nhận')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu mới/)).toBeInTheDocument();
  });

  it('bước 2: nhập mã + mật khẩu mới → gọi API reset và hiện thông báo thành công', async () => {
    mockForgot.mockResolvedValue(undefined);
    mockReset.mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'brand@test.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã đặt lại' }));
    await screen.findByLabelText('Mã xác nhận');

    fireEvent.change(screen.getByLabelText('Mã xác nhận'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu mới/), { target: { value: 'MatKhauMoi99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        email: 'brand@test.vn',
        code: '123456',
        newPassword: 'MatKhauMoi99',
      });
    });
    expect(await screen.findByText(/đặt lại thành công/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang đăng nhập' })).toBeInTheDocument();
  });

  it('nút đặt lại disable khi mã chưa đủ 6 số', async () => {
    mockForgot.mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'brand@test.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã đặt lại' }));
    await screen.findByLabelText('Mã xác nhận');

    fireEvent.change(screen.getByLabelText('Mã xác nhận'), { target: { value: '12' } });
    expect(screen.getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeDisabled();
  });
});
