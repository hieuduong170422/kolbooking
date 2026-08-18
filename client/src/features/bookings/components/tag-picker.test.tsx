import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TagPicker } from './tag-picker';

const PRESETS = ['Cận cảnh sản phẩm', 'Cảnh không gian quán'];

const renderPicker = (onChange = vi.fn(), selected: readonly string[] = []) => {
  render(
    <TagPicker
      label="Cảnh bắt buộc"
      description="Chọn từ gợi ý hoặc tự thêm."
      presets={PRESETS}
      selected={selected}
      onChange={onChange}
      addPlaceholder="Cảnh khác..."
    />,
  );
  return onChange;
};

/** Bản có state thật — kiểm tra hành vi qua nhiều thao tác liên tiếp. */
const Harness = () => {
  const [selected, setSelected] = useState<readonly string[]>([]);
  return (
    <TagPicker
      label="Điều cấm"
      description=""
      presets={PRESETS}
      selected={selected}
      onChange={setSelected}
      addPlaceholder="Thêm..."
    />
  );
};

const openList = (name = 'Cảnh bắt buộc'): void => {
  fireEvent.click(screen.getByRole('combobox', { name }));
};

describe('TagPicker', () => {
  it('danh sách nằm trong dropdown, chưa mở thì chưa hiện', () => {
    renderPicker();

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('mở dropdown thì thấy đủ mọi gợi ý', () => {
    renderPicker();

    openList();

    for (const preset of PRESETS) {
      expect(screen.getByRole('option', { name: preset })).toBeInTheDocument();
    }
  });

  it('chọn mục trong dropdown thì thêm vào danh sách', () => {
    const onChange = renderPicker();

    openList();
    fireEvent.click(screen.getByRole('option', { name: 'Cận cảnh sản phẩm' }));

    expect(onChange).toHaveBeenCalledWith(['Cận cảnh sản phẩm']);
  });

  it('chọn lại mục đang chọn thì bỏ chọn', () => {
    const onChange = renderPicker(vi.fn(), ['Cận cảnh sản phẩm']);

    openList();
    fireEvent.click(screen.getByRole('option', { name: 'Cận cảnh sản phẩm' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('mục đã chọn hiện thành thẻ kèm nút ×', () => {
    const onChange = renderPicker(vi.fn(), ['Cận cảnh sản phẩm', 'Cảnh không gian quán']);

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ Cận cảnh sản phẩm' }));

    expect(onChange).toHaveBeenCalledWith(['Cảnh không gian quán']);
  });

  it('nút mở đếm số mục đã chọn', () => {
    renderPicker(vi.fn(), ['Cận cảnh sản phẩm']);

    expect(screen.getByRole('combobox', { name: 'Cảnh bắt buộc' })).toHaveTextContent(
      'Đã chọn 1 mục',
    );
  });

  it('tự thêm được mục ngoài gợi ý', () => {
    render(<Harness />);
    const input = screen.getByLabelText(/Thêm mục cho/);

    fireEvent.change(input, { target: { value: 'Quay cảnh pha chế' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));

    // Mục tự nhập vào thẳng danh sách đã chọn và có mặt trong dropdown.
    expect(screen.getByRole('button', { name: 'Bỏ Quay cảnh pha chế' })).toBeInTheDocument();
    openList('Điều cấm');
    expect(screen.getByRole('option', { name: 'Quay cảnh pha chế' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('Enter thêm mục chứ không gửi cả form', () => {
    render(<Harness />);
    const input = screen.getByLabelText(/Thêm mục cho/);

    fireEvent.change(input, { target: { value: 'Cảnh đóng gói' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByRole('button', { name: 'Bỏ Cảnh đóng gói' })).toBeInTheDocument();
  });

  it('không thêm mục rỗng hoặc trùng mục đã có', () => {
    const onChange = renderPicker(vi.fn(), ['Cận cảnh sản phẩm']);
    const input = screen.getByLabelText(/Thêm mục cho/);

    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Thêm' })).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Cận cảnh sản phẩm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('mục do mẫu nạp vào tuy không thuộc gợi ý vẫn nằm trong dropdown', () => {
    renderPicker(vi.fn(), ['Mục do mẫu nạp vào']);

    openList();

    expect(screen.getByRole('option', { name: 'Mục do mẫu nạp vào' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
