import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';
import { Textarea } from './textarea';

describe('Input', () => {
  it('nối nhãn với ô nhập để tìm được bằng label', () => {
    render(<Input label="Tên hiển thị" defaultValue="Minh" />);

    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Minh');
  });

  it('gợi ý không lọt vào tên nhãn của ô nhập', () => {
    render(<Input label="Mật khẩu" hint="Tối thiểu 8 ký tự." />);

    // Nếu <small> nằm trong <label> thì accessible name sẽ dính cả câu gợi ý.
    const field = screen.getByLabelText('Mật khẩu');
    expect(field).toBeInTheDocument();
    expect(screen.getByText('Tối thiểu 8 ký tự.')).toBeInTheDocument();
  });

  it('trỏ aria-describedby tới cả lỗi và gợi ý', () => {
    render(<Input label="Email" hint="Email công ty." error="Email không hợp lệ." />);

    const field = screen.getByLabelText('Email');
    const described = field.getAttribute('aria-describedby') ?? '';
    const ids = described.split(' ');
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0])).toHaveTextContent('Email không hợp lệ.');
    expect(document.getElementById(ids[1])).toHaveTextContent('Email công ty.');
  });

  it('bật aria-invalid và class lỗi khi có error', () => {
    render(<Input label="Email" error="Sai rồi" />);

    const field = screen.getByLabelText('Email');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field.className).toContain('input--error');
  });

  it('không dựng khung khi chỉ có aria-label', () => {
    const { container } = render(<Input aria-label="Số lượng" narrow />);

    expect(container.querySelector('.form-field')).toBeNull();
    expect(screen.getByLabelText('Số lượng').className).toContain('input--narrow');
  });

  it('giữ nguyên các thuộc tính gốc của input', () => {
    render(<Input label="Giá" type="number" min={1000} step={500} required />);

    const field = screen.getByLabelText('Giá');
    expect(field).toHaveAttribute('type', 'number');
    expect(field).toHaveAttribute('min', '1000');
    expect(field).toBeRequired();
  });
});

describe('Textarea', () => {
  it('đếm ký tự theo maxLength', () => {
    render(<Textarea label="Mô tả" value="abcd" maxLength={100} showCounter onChange={() => {}} />);

    expect(screen.getByText('4/100')).toBeInTheDocument();
  });

  it('không hiện bộ đếm khi không bật showCounter', () => {
    render(<Textarea label="Mô tả" value="abcd" maxLength={100} onChange={() => {}} />);

    expect(screen.queryByText('4/100')).toBeNull();
  });
});
