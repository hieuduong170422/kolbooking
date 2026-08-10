import { describe, expect, it } from 'vitest';
import { hashOtp, resolveOtp } from '../src/modules/auth/verification.service.js';

/**
 * Mã OTP cố định cho môi trường chưa có SMTP (DEV_OTP_CODE). Chỉ khâu sinh mã
 * bị thay; phần đối chiếu vẫn đi qua hashOtp như mã ngẫu nhiên, nên hạn dùng,
 * giới hạn nhập sai và luật dùng-một-lần không bị nới lỏng.
 */
describe('resolveOtp', () => {
  it('dùng đúng mã cố định khi môi trường có cấu hình', () => {
    expect(resolveOtp('111111')).toBe('111111');
  });

  it('sinh mã ngẫu nhiên 6 chữ số khi không cấu hình', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(resolveOtp(undefined)).toMatch(/^\d{6}$/);
    }
  });

  it('mã ngẫu nhiên không lặp lại một giá trị duy nhất', () => {
    const codes = new Set(Array.from({ length: 30 }, () => resolveOtp(undefined)));
    expect(codes.size).toBeGreaterThan(1);
  });

  it('mã cố định vẫn đi qua cùng cơ chế hash khi đối chiếu', () => {
    // Không có đường tắt nào bỏ qua hash: lưu và so sánh y hệt mã ngẫu nhiên.
    expect(hashOtp(resolveOtp('111111'))).toBe(hashOtp('111111'));
    expect(hashOtp('111111')).not.toBe('111111');
  });
});
