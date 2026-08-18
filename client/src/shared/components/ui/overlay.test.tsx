import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileButton } from './file-button';
import { Modal } from './modal';
import { Tabs } from './tabs';

describe('Modal', () => {
  it('nối tiêu đề vào dialog bằng aria-labelledby', () => {
    render(<Modal title="Khóa tài khoản" onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Khóa tài khoản' })).toBeInTheDocument();
  });

  it('đóng khi bấm nút × và khi nhấn Escape', () => {
    const onClose = vi.fn();
    render(<Modal title="Xác nhận" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('hiện nội dung và nút hành động ở đáy', () => {
    render(
      <Modal title="Xác nhận" onClose={vi.fn()} footer={<button type="button">Đồng ý</button>}>
        <p>Bạn chắc chứ?</p>
      </Modal>,
    );

    expect(screen.getByText('Bạn chắc chứ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đồng ý' })).toBeInTheDocument();
  });
});

describe('Tabs', () => {
  it('đánh dấu tab đang chọn và báo giá trị mới', () => {
    const onChange = vi.fn();
    render(
      <Tabs
        label="Lọc theo trạng thái"
        value="open"
        options={[
          { key: 'open', value: 'open', label: 'Đang mở' },
          { key: 'done', value: 'done', label: 'Đã xử lý' },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Đang mở' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đã xử lý' }));
    expect(onChange).toHaveBeenCalledWith('done');
  });
});

describe('FileButton', () => {
  it('trả file đã chọn và xoá giá trị ô nhập để chọn lại vẫn nổ change', () => {
    const onSelect = vi.fn();
    render(<FileButton label="Tải giấy tờ" accept="image/png" onSelect={onSelect} />);

    const input = screen.getByLabelText('Tải giấy tờ') as HTMLInputElement;
    const file = new File(['x'], 'cmnd.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onSelect).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('không gọi onSelect khi người dùng huỷ hộp thoại chọn file', () => {
    const onSelect = vi.fn();
    render(<FileButton label="Tải ảnh" onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText('Tải ảnh'), { target: { files: [] } });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
