import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select } from './select';

const OPTIONS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
] as const;

describe('Select', () => {
  it('dựng option từ prop options', () => {
    render(<Select label="Nền tảng" options={OPTIONS} value="tiktok" onChange={() => {}} />);

    const select = screen.getByLabelText('Nền tảng');
    expect(select).toHaveValue('tiktok');
    expect(screen.getByRole('option', { name: 'YouTube' })).toBeInTheDocument();
  });

  it('thêm mục trống đứng đầu khi có placeholder', () => {
    render(
      <Select
        label="Nền tảng"
        placeholder="Tất cả nền tảng"
        options={OPTIONS}
        value=""
        onChange={() => {}}
      />,
    );

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Tất cả nền tảng');
    expect(options[0]).toHaveValue('');
  });

  it('báo giá trị mới khi đổi lựa chọn', () => {
    // Đọc value ngay trong handler: select là controlled nên sau khi render lại
    // React trả DOM về 'tiktok', xem event.target sau đó sẽ ra giá trị cũ.
    const seen: string[] = [];
    render(
      <Select
        label="Nền tảng"
        options={OPTIONS}
        value="tiktok"
        onChange={(event) => seen.push(event.target.value)}
      />,
    );

    fireEvent.change(screen.getByLabelText('Nền tảng'), { target: { value: 'youtube' } });

    expect(seen).toEqual(['youtube']);
  });

  it('nhận option truyền qua children', () => {
    render(
      <Select label="Thành phố" value="hn" onChange={() => {}}>
        <option value="hn">Hà Nội</option>
      </Select>,
    );

    expect(screen.getByRole('option', { name: 'Hà Nội' })).toBeInTheDocument();
  });
});
