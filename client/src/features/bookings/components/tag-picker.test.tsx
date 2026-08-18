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

describe('TagPicker', () => {
  it('hiển thị mọi gợi ý để bấm chọn', () => {
    renderPicker();

    for (const preset of PRESETS) {
      expect(screen.getByLabelText(preset)).toBeInTheDocument();
    }
  });

  it('bấm gợi ý thì thêm vào danh sách đã chọn', () => {
    const onChange = renderPicker();

    fireEvent.click(screen.getByLabelText('Cận cảnh sản phẩm'));

    expect(onChange).toHaveBeenCalledWith(['Cận cảnh sản phẩm']);
  });

  it('bấm lại mục đang chọn thì bỏ chọn', () => {
    const onChange = renderPicker(vi.fn(), ['Cận cảnh sản phẩm']);

    fireEvent.click(screen.getByLabelText('Cận cảnh sản phẩm'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('tự thêm được mục ngoài gợi ý', () => {
    render(<Harness />);
    const input = screen.getByLabelText(/Thêm mục cho/);

    fireEvent.change(input, { target: { value: 'Quay cảnh pha chế' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm' }));

    // Mục tự nhập phải hiện ra và ở trạng thái đã chọn.
    expect(screen.getByLabelText('Quay cảnh pha chế')).toBeChecked();
  });

  it('Enter thêm mục chứ không gửi cả form', () => {
    render(<Harness />);
    const input = screen.getByLabelText(/Thêm mục cho/);

    fireEvent.change(input, { target: { value: 'Cảnh đóng gói' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByLabelText('Cảnh đóng gói')).toBeChecked();
  });

  it('không thêm mục rỗng hoặc trùng mục đã có', () => {
    const onChange = renderPicker(vi.fn(), ['Cận cảnh sản phẩm']);
    const input = screen.getByLabelText(/Thêm mục cho/);

    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: '+ Thêm' })).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Cận cảnh sản phẩm' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('mục đã chọn nhưng không nằm trong gợi ý vẫn hiển thị', () => {
    // Mẫu theo mục tiêu có thể nạp mục không thuộc preset của lĩnh vực này.
    renderPicker(vi.fn(), ['Mục do mẫu nạp vào']);

    expect(screen.getByLabelText('Mục do mẫu nạp vào')).toBeChecked();
  });
});
