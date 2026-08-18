import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';
import { IconButton } from './icon-button';

describe('Button', () => {
  it('mặc định là type=button để không vô tình submit form', () => {
    const onSubmit = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <Button>Hủy</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gửi form khi khai báo type=submit', () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" variant="primary">
          Lưu
        </Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('khoá nút và báo aria-busy khi loading', () => {
    render(<Button loading>Đang lưu</Button>);

    const button = screen.getByRole('button', { name: 'Đang lưu' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('gắn class theo variant và size', () => {
    render(
      <Button variant="danger" size="sm" block>
        Xóa
      </Button>,
    );

    const className = screen.getByRole('button', { name: 'Xóa' }).className;
    expect(className).toContain('button--danger');
    expect(className).toContain('button--sm');
    expect(className).toContain('button--block');
  });

  it('variant link dùng .button-link chứ không phải .button', () => {
    render(<Button variant="link">Xóa lọc</Button>);

    const className = screen.getByRole('button', { name: 'Xóa lọc' }).className;
    expect(className).toContain('button-link');
    expect(className).not.toContain('button--');
  });
});

describe('IconButton', () => {
  it('lấy label làm tên khả truy cập và title', () => {
    render(<IconButton label="Xóa dòng 1" icon={<svg />} tone="danger" />);

    const button = screen.getByRole('button', { name: 'Xóa dòng 1' });
    expect(button).toHaveAttribute('title', 'Xóa dòng 1');
    expect(button.className).toContain('icon-button--danger');
  });
});
