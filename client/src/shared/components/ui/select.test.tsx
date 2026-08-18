import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './select';

const OPTIONS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
] as const;

const setup = (value = 'tiktok', onChange = vi.fn(), placeholder?: string) => {
  render(
    <Select
      label="Nền tảng"
      options={OPTIONS}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />,
  );
  return { onChange, trigger: screen.getByRole('combobox', { name: 'Nền tảng' }) };
};

describe('Select', () => {
  it('nút đóng hiện nhãn của mục đang chọn, chưa mở thì chưa có danh sách', () => {
    const { trigger } = setup();

    expect(trigger).toHaveTextContent('TikTok');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('mở ra thì liệt kê mọi lựa chọn, đánh dấu mục đang chọn', () => {
    const { trigger } = setup();

    fireEvent.click(trigger);

    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'TikTok' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: 'YouTube' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('chọn mục khác thì báo value mới và đóng danh sách', () => {
    const Harness = () => {
      const [value, setValue] = useState('tiktok');
      return <Select label="Nền tảng" options={OPTIONS} value={value} onChange={setValue} />;
    };
    render(<Harness />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Nền tảng' }));
    fireEvent.click(screen.getByRole('option', { name: 'YouTube' }));

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Nền tảng' })).toHaveTextContent('YouTube');
  });

  it('thêm mục trống đứng đầu khi có placeholder', () => {
    const { trigger } = setup('', vi.fn(), 'Tất cả nền tảng');

    expect(trigger).toHaveTextContent('Tất cả nền tảng');
    fireEvent.click(trigger);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Tất cả nền tảng');
  });

  it('bàn phím mở và chọn được mà không cần chuột', () => {
    const { trigger, onChange } = setup();

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('youtube');
  });

  it('mở ra là trỏ sẵn vào mục đang chọn chứ không phải mục đầu', () => {
    const { trigger, onChange } = setup('youtube');

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('youtube');
  });

  it('Escape đóng danh sách mà không đổi lựa chọn', () => {
    const { trigger, onChange } = setup();

    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('bung lên trên khi dưới nút không còn chỗ', () => {
    const { trigger } = setup();
    // Nút nằm sát đáy màn hình: dưới còn 40px, trên còn 700px.
    vi.spyOn(trigger.parentElement as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      top: 700,
      bottom: 740,
      height: 40,
    } as DOMRect);

    fireEvent.click(trigger);

    expect(screen.getByRole('listbox').className).toContain('listbox__panel--above');
  });

  it('danh sách trỏ aria-labelledby về đúng thẻ nhãn đang tồn tại', () => {
    const { trigger } = setup();

    fireEvent.click(trigger);

    const labelledBy = screen.getByRole('listbox').getAttribute('aria-labelledby');
    expect(labelledBy).not.toBeNull();
    expect(document.getElementById(labelledBy ?? '')).toHaveTextContent('Nền tảng');
  });

  it('bật aria-invalid và class lỗi khi có error', () => {
    render(
      <Select label="Nền tảng" options={OPTIONS} value="tiktok" onChange={vi.fn()} error="Chọn đi" />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Nền tảng' });
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger.className).toContain('select--error');
  });
});
