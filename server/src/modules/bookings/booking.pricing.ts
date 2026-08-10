import { env } from '../../config/env.js';
import type { PackageAddOn } from '../packages/package.types.js';
import type { BookingTotals } from './booking.types.js';

/**
 * Tính tiền booking — LUÔN chạy phía server, client không gửi lên số nào
 * (BKG-001, PAY-001). Đơn vị VND, làm tròn về số nguyên (BR-004).
 *
 * Mô hình: brand trả giá creator + phí nền tảng; creator nhận đúng giá
 * niêm yết trong giai đoạn đầu (SRS §2.4).
 */
export const calculateTotals = (
  packagePriceVnd: number,
  selectedAddOns: readonly PackageAddOn[],
): BookingTotals => {
  const addOnsTotalVnd = selectedAddOns.reduce((sum, addOn) => sum + addOn.priceVnd, 0);
  const subtotalVnd = packagePriceVnd + addOnsTotalVnd;

  const percentFee = Math.round((subtotalVnd * env.PLATFORM_FEE_PERCENT) / 100);
  // Phí tối thiểu bảo vệ biên với booking giá trị nhỏ (OD-03).
  const platformFeeVnd = Math.max(percentFee, env.PLATFORM_FEE_MIN_VND);

  return {
    packagePriceVnd,
    addOnsTotalVnd,
    platformFeeVnd,
    totalVnd: subtotalVnd + platformFeeVnd,
    creatorEarningsVnd: subtotalVnd,
  };
};

/** Mã tra cứu KB-YYMMDD-XXXX (BKG-011) — dễ đọc qua điện thoại khi hỗ trợ. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I/O/0/1 để tránh đọc nhầm

export const generateBookingCode = (now: Date, randomBytes: Uint8Array): string => {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = Array.from(randomBytes.slice(0, 4))
    .map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
    .join('');
  return `KB-${yy}${mm}${dd}-${suffix}`;
};
