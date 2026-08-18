import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';
import { ChipGroup } from './chip-group';
import { RadioGroup } from './radio-group';
import { SegmentedControl } from './segmented-control';
import { ToggleChips } from './toggle-chips';

const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
] as const;

describe('Checkbox', () => {
  it('bấm vào chữ cũng đổi trạng thái', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Đồng ý điều khoản" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Đồng ý điều khoản'));

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('RadioGroup', () => {
  it('chỉ đánh dấu lựa chọn đang chọn', () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        legend="Bạn là"
        name="role"
        value="brand"
        options={[
          { value: 'brand', label: 'Nhãn hàng' },
          { value: 'creator', label: 'Creator' },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText('Nhãn hàng')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Creator'));
    expect(onChange).toHaveBeenCalledWith('creator');
  });
});

describe('SegmentedControl', () => {
  it('báo giá trị mới khi đổi phân đoạn', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        legend="Hình thức"
        name="mode"
        value="online"
        options={[
          { value: 'online', label: 'Online' },
          { value: 'onsite', label: 'Tại chỗ' },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Tại chỗ'));

    expect(onChange).toHaveBeenCalledWith('onsite');
  });
});

describe('ChipGroup', () => {
  it('thêm chip chưa chọn vào danh sách', () => {
    const onChange = vi.fn();
    render(
      <ChipGroup legend="Nền tảng" value={['tiktok']} options={PLATFORMS} onChange={onChange} />,
    );

    fireEvent.click(screen.getByLabelText('YouTube'));

    expect(onChange).toHaveBeenCalledWith(['tiktok', 'youtube']);
  });

  it('bỏ chip đang chọn khi bấm lại', () => {
    const onChange = vi.fn();
    render(
      <ChipGroup legend="Nền tảng" value={['tiktok']} options={PLATFORMS} onChange={onChange} />,
    );

    fireEvent.click(screen.getByLabelText('TikTok'));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe('ToggleChips', () => {
  it('đánh dấu chip đang bật bằng aria-pressed', () => {
    const onToggle = vi.fn();
    render(
      <ToggleChips
        legend="Loại creator"
        options={[
          { key: 'kol', value: 'kol', label: 'KOL' },
          { key: 'koc', value: 'koc', label: 'KOC' },
        ]}
        isActive={(value) => value === 'kol'}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByRole('button', { name: 'KOL' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'KOC' }));
    expect(onToggle).toHaveBeenCalledWith('koc');
  });
});
