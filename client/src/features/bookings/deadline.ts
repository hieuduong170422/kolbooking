import type { PackageAddOn } from '../packages/types/package-types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Thời gian sản xuất thực tế sau khi tính add-on giao nhanh. Số ngày rút
 * xuống còn bao nhiêu do server quyết (GET /config) — client chỉ hiển thị
 * trước cho khớp, server vẫn là bên từ chối deadline quá sớm.
 *
 * Gói vốn nhanh hơn add-on thì add-on không kéo dài ngược lại.
 */
export const effectiveTurnaroundDays = (
  turnaroundDays: number,
  selectedAddOns: readonly PackageAddOn[],
  fastDeliveryTurnaroundDays: number,
): number =>
  selectedAddOns.some((addOn) => addOn.type === 'fast_delivery')
    ? Math.min(turnaroundDays, fastDeliveryTurnaroundDays)
    : turnaroundDays;

/**
 * Ngày sớm nhất brand được chọn (YYYY-MM-DD cho input type=date) = hôm nay +
 * thời gian sản xuất. Chặn ngay ở đây đỡ mất một vòng gửi đi gửi lại.
 */
export const earliestDeadlineDay = (turnaroundDays: number): string =>
  new Date(Date.now() + turnaroundDays * DAY_MS).toISOString().slice(0, 10);
