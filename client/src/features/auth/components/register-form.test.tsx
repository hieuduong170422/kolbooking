import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm, type RegisterFormProps } from './register-form';

/** Form có Link tới /terms và /privacy nên cần router bao ngoài. */
const renderForm = (onSubmit: RegisterFormProps['onSubmit']): void => {
  render(
    <MemoryRouter>
      <RegisterForm onSubmit={onSubmit} />
    </MemoryRouter>,
  );
};

const fillRequiredFields = (): void => {
  fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Brand Mới' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'brand@test.vn' } });
  fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'MatKhau123' } });
};

describe('RegisterForm (AUTH-007)', () => {
  it('nút Đăng ký bị disable khi chưa tick đồng ý điều khoản', () => {
    renderForm(vi.fn());
    fillRequiredFields();

    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeDisabled();
  });

  it('tick điều khoản → submit gửi termsAccepted=true', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);
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

describe('Link điều khoản (A2 — link chết trong khi vẫn ép đồng ý)', () => {
  it('trỏ đúng /terms và /privacy, mở tab mới để không mất form đang điền', () => {
    render(
      <MemoryRouter>
        <RegisterForm onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    const terms = screen.getByRole('link', { name: 'Điều khoản sử dụng' });
    const privacy = screen.getByRole('link', { name: 'Chính sách quyền riêng tư' });

    expect(terms).toHaveAttribute('href', '/terms');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(terms).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(privacy).toHaveAttribute('href', '/privacy');
  });
});
