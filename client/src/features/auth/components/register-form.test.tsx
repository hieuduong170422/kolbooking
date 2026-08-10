import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from './register-form';

const fillRequiredFields = (): void => {
  fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Brand Mới' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'brand@test.vn' } });
  fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'MatKhau123' } });
};

describe('RegisterForm (AUTH-007)', () => {
  it('nút Đăng ký bị disable khi chưa tick đồng ý điều khoản', () => {
    render(<RegisterForm onSubmit={vi.fn()} />);
    fillRequiredFields();

    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeDisabled();
  });

  it('tick điều khoản → submit gửi termsAccepted=true', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RegisterForm onSubmit={onSubmit} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        displayName: 'Brand Mới',
        email: 'brand@test.vn',
        password: 'MatKhau123',
        role: 'brand',
        termsAccepted: true,
      });
    });
  });
});
