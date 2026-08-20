import { describe, expect, it } from 'vitest';
import { coverGradient, creatorInitials } from './avatar';

describe('creatorInitials', () => {
  it('lấy 2 chữ đầu, viết hoa', () => {
    expect(creatorInitials('Lan Chi Foodie')).toBe('LC');
    expect(creatorInitials('minh tuấn')).toBe('MT');
  });

  it('tên một chữ vẫn ra được chữ cái', () => {
    expect(creatorInitials('Bống')).toBe('B');
  });
});

describe('coverGradient', () => {
  it('cùng tên luôn ra cùng màu — không được nhảy màu giữa các lần render', () => {
    expect(coverGradient('Lan Chi Foodie')).toBe(coverGradient('Lan Chi Foodie'));
  });

  it('tên khác nhau thì trải ra nhiều màu, không dồn hết vào một', () => {
    const names = ['Lan Chi Foodie', 'Minh Tuấn', 'Bống Nguyễn', 'Hà Nội Review', 'Quán Ngon'];
    const distinct = new Set(names.map(coverGradient));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('luôn trả về một gradient hợp lệ', () => {
    expect(coverGradient('Bất Kỳ Ai')).toMatch(/^linear-gradient\(/);
  });
});
