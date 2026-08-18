import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelect } from './multi-select';

const OPTIONS = ['Cận cảnh sản phẩm', 'Cảnh không gian quán', 'Nêu giá trong menu'];

const setup = (value: readonly string[] = [], onChange = vi.fn()) => {
  render(
    <MultiSelect
      label="Cảnh bắt buộc"
      hint="Chọn từ gợi ý."
      options={OPTIONS}
      value={value}
      onChange={onChange}
      placeholder="Chọn cảnh..."
    />,
  );
  return { onChange, trigger: screen.getByRole('combobox', { name: 'Cảnh bắt buộc' }) };
};

/** Bản có state thật — kiểm tra chuỗi thao tác liên tiếp. */
const Harness = () => {
  const [value, setValue] = useState<readonly string[]>([]);
  return (
    <MultiSelect
      label="Cảnh bắt buộc"
      options={OPTIONS}
      value={value}
      onChange={setValue}
      placeholder="Chọn cảnh..."
    />
  );
};

describe('MultiSelect', () => {
  it('đóng lúc đầu, nút hiện placeholder', () => {
    const { trigger } = setup();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Chọn cảnh...');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('mở dropdown thì liệt kê đầy đủ mọi mục', () => {
    const { trigger } = setup();

    fireEvent.click(trigger);

    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
  });

  it('đánh dấu mục đang chọn bằng aria-selected', () => {
    setup(['Cảnh không gian quán']);

    fireEvent.click(screen.getByRole('combobox', { name: 'Cảnh bắt buộc' }));

    expect(screen.getByRole('option', { name: 'Cảnh không gian quán' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: 'Cận cảnh sản phẩm' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('dropdown vẫn mở sau khi chọn để còn chọn tiếp mục khác', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Cảnh bắt buộc' }));

    fireEvent.click(screen.getByRole('option', { name: 'Cận cảnh sản phẩm' }));
    fireEvent.click(screen.getByRole('option', { name: 'Nêu giá trong menu' }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Cảnh bắt buộc' })).toHaveTextContent(
      'Đã chọn 2 mục',
    );
  });

  it('mục đã chọn hiện thành thẻ, bấm × thì bỏ khỏi danh sách', () => {
    const { onChange } = setup(['Cận cảnh sản phẩm', 'Nêu giá trong menu']);

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ Cận cảnh sản phẩm' }));

    expect(onChange).toHaveBeenCalledWith(['Nêu giá trong menu']);
  });

  it('mũi tên xuống mở dropdown, Enter chọn mục đang trỏ tới', () => {
    const { trigger, onChange } = setup();

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['Cảnh không gian quán']);
  });

  it('mũi tên lên từ trạng thái đóng thì trỏ vào mục cuối', () => {
    const { trigger, onChange } = setup();

    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['Nêu giá trong menu']);
  });

  it('mũi tên dừng ở hai đầu danh sách chứ không chạy vòng', () => {
    const { trigger, onChange } = setup();

    fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // mở, trỏ mục đầu
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Cận cảnh sản phẩm']);

    for (let i = 0; i < 5; i += 1) fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Nêu giá trong menu']);
  });

  it('Escape và bấm ra ngoài đều đóng dropdown', () => {
    const { trigger } = setup();

    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('báo rõ khi không có mục nào để chọn', () => {
    render(
      <MultiSelect
        label="Cảnh bắt buộc"
        options={[]}
        value={[]}
        onChange={vi.fn()}
        placeholder="Chọn cảnh..."
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Cảnh bắt buộc' }));

    expect(screen.getByText('Không có mục nào để chọn.')).toBeInTheDocument();
  });
});
