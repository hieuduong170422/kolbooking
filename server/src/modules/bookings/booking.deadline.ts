import type { PackageAddOn } from '../packages/package.types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Add-on "giao nhanh" rút thời gian sản xuất xuống 48h. Brand trả thêm tiền
 * thì phải nhận lại đúng thứ đã mua — trước đây add-on này chỉ cộng tiền mà
 * ngày sớm nhất vẫn giữ nguyên theo gói.
 */
export const FAST_DELIVERY_TURNAROUND_DAYS = 2;

/** Ngày UTC dạng YYYY-MM-DD — deadline là chuyện của NGÀY, không của giờ. */
const toUtcDay = (value: Date): string => value.toISOString().slice(0, 10);

/**
 * Thời gian sản xuất thực tế sau khi tính add-on. Gói vốn đã nhanh hơn 48h
 * thì add-on không được kéo dài ngược lại.
 */
export const effectiveTurnaroundDays = (
  turnaroundDays: number,
  selectedAddOns: readonly PackageAddOn[],
): number =>
  selectedAddOns.some((addOn) => addOn.type === 'fast_delivery')
    ? Math.min(turnaroundDays, FAST_DELIVERY_TURNAROUND_DAYS)
    : turnaroundDays;

/** Ngày sớm nhất brand được chọn = hôm nay + thời gian sản xuất. */
export const earliestDeadlineDay = (turnaroundDays: number, now: Date): string =>
  toUtcDay(new Date(now.getTime() + turnaroundDays * DAY_MS));

/**
 * So sánh theo ngày UTC chứ không theo timestamp: client gửi 00:00Z của ngày
 * được chọn, nên đúng ngày sớm nhất vẫn "nhỏ hơn" now + turnaround nếu so
 * bằng mốc thời gian — chọn đúng ngày hợp lệ mà vẫn bị từ chối.
 */
export const isDeadlineTooEarly = (
  desiredDeadlineIso: string,
  turnaroundDays: number,
  now: Date,
): boolean => toUtcDay(new Date(desiredDeadlineIso)) < earliestDeadlineDay(turnaroundDays, now);

/** 2026-08-25 → 25/08/2026 — thông báo lỗi đọc bằng mắt người Việt. */
export const formatDayVi = (utcDay: string): string => {
  const [year, month, day] = utcDay.split('-');
  return `${day}/${month}/${year}`;
};
