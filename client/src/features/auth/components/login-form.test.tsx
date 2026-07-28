import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../shared/api/api-types';
import { LoginForm } from './login-form';

const fillAndSubmit = (email: string, password: string): void => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
};

describe('LoginForm', () => {
  it('gọi onSubmit với email và mật khẩu đã nhập', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);

    fillAndSubmit('creator@demo.vn', 'Demo@1234');

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ email: 'creator@demo.vn', password: 'Demo@1234' });
    });
  });

  it('hiển thị message lỗi từ API khi đăng nhập thất bại', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiClientError('UNAUTHORIZED', 'Email hoặc mật khẩu không đúng.', 401));
    render(<LoginForm onSubmit={onSubmit} />);

    fillAndSubmit('creator@demo.vn', 'SaiMatKhau1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không đúng.');
  });

  it('disable nút trong lúc đang gửi', async () => {
    let resolveSubmit: () => void = () => {};
    const onSubmit = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<LoginForm onSubmit={onSubmit} />);

    fillAndSubmit('creator@demo.vn', 'Demo@1234');

    expect(await screen.findByRole('button', { name: 'Đang đăng nhập...' })).toBeDisabled();
    resolveSubmit();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
    });
  });
});
