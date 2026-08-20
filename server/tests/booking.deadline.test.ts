import { describe, expect, it } from 'vitest';
import {
  FAST_DELIVERY_TURNAROUND_DAYS,
  earliestDeadlineDay,
  effectiveTurnaroundDays,
  formatDayVi,
  isDeadlineTooEarly,
} from '../src/modules/bookings/booking.deadline.js';
import type { PackageAddOn } from '../src/modules/packages/package.types.js';

const addOn = (type: PackageAddOn['type']): PackageAddOn => ({
  id: `ado_${type}`,
  type,
  label: type,
  priceVnd: 100_000,
});

const NOW = new Date('2026-08-20T09:30:00.000Z');

describe('effectiveTurnaroundDays — add-on giao nhanh phải rút ngắn thật', () => {
  it('không chọn add-on → giữ nguyên thời gian sản xuất của gói', () => {
    expect(effectiveTurnaroundDays(5, [])).toBe(5);
    expect(effectiveTurnaroundDays(5, [addOn('raw_files')])).toBe(5);
  });

  it('chọn fast_delivery → rút về 48h', () => {
    expect(effectiveTurnaroundDays(5, [addOn('fast_delivery')])).toBe(
      FAST_DELIVERY_TURNAROUND_DAYS,
    );
    expect(effectiveTurnaroundDays(14, [addOn('raw_files'), addOn('fast_delivery')])).toBe(
      FAST_DELIVERY_TURNAROUND_DAYS,
    );
  });

  it('gói vốn đã nhanh hơn 48h → add-on không kéo dài ngược lại', () => {
    expect(effectiveTurnaroundDays(1, [addOn('fast_delivery')])).toBe(1);
  });
});

describe('earliestDeadlineDay — mốc ngày sớm nhất tính theo ngày UTC', () => {
  it('hôm nay + số ngày sản xuất', () => {
    expect(earliestDeadlineDay(5, NOW)).toBe('2026-08-25');
    expect(earliestDeadlineDay(0, NOW)).toBe('2026-08-20');
  });
});

describe('isDeadlineTooEarly — so theo NGÀY, không so theo giờ', () => {
  it('deadline quá khứ → quá sớm', () => {
    expect(isDeadlineTooEarly('2020-01-01T00:00:00.000Z', 5, NOW)).toBe(true);
  });

  it('đúng ngày sớm nhất (client gửi nửa đêm UTC) → hợp lệ', () => {
    // Client gửi 00:00Z của ngày được chọn; so theo timestamp sẽ sai vì
    // 25/08 00:00Z < 20/08 09:30Z + 5 ngày. Phải so theo ngày.
    expect(isDeadlineTooEarly('2026-08-25T00:00:00.000Z', 5, NOW)).toBe(false);
  });

  it('sớm hơn một ngày → quá sớm', () => {
    expect(isDeadlineTooEarly('2026-08-24T00:00:00.000Z', 5, NOW)).toBe(true);
  });

  it('muộn hơn mốc → hợp lệ', () => {
    expect(isDeadlineTooEarly('2026-12-01T00:00:00.000Z', 5, NOW)).toBe(false);
  });
});

describe('formatDayVi', () => {
  it('đổi ngày ISO sang dd/mm/yyyy', () => {
    expect(formatDayVi('2026-08-25')).toBe('25/08/2026');
  });
});
