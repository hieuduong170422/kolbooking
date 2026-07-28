import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatVnd } from './format';

describe('formatVnd', () => {
  it('định dạng tiền VND với dấu chấm phân tách', () => {
    // Intl vi-VN dùng non-breaking space trước ký hiệu ₫
    expect(formatVnd(1_500_000).replace(/ /g, ' ')).toBe('1.500.000 ₫');
  });

  it('không có phần thập phân', () => {
    expect(formatVnd(700_000)).not.toContain(',');
  });
});

describe('formatCompactNumber', () => {
  it('giữ nguyên số nhỏ hơn 1000', () => {
    expect(formatCompactNumber(950)).toBe('950');
  });

  it('rút gọn hàng nghìn thành K', () => {
    expect(formatCompactNumber(48_000)).toBe('48K');
    expect(formatCompactNumber(12_500)).toBe('12.5K');
  });

  it('rút gọn hàng triệu thành M', () => {
    expect(formatCompactNumber(1_200_000)).toBe('1.2M');
    expect(formatCompactNumber(2_000_000)).toBe('2M');
  });
});
