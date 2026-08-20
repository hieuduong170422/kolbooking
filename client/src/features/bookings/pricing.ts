import type { AppConfig } from '../config/types/config-types';

export interface EstimatedTotals {
  readonly subtotalVnd: number;
  readonly platformFeeVnd: number;
  readonly totalVnd: number;
}

/**
 * Ước tính tiền brand phải trả — CÙNG công thức với calculateTotals ở server
 * (phí theo %, có mức sàn). Đây chỉ là con số để brand thấy trước khi bấm
 * tạo booking; server tính lại và số của server mới là số cuối (PAY-001).
 */
export const estimateTotals = (subtotalVnd: number, config: AppConfig): EstimatedTotals => {
  const percentFee = Math.round((subtotalVnd * config.platformFeePercent) / 100);
  const platformFeeVnd = Math.max(percentFee, config.platformFeeMinVnd);
  return { subtotalVnd, platformFeeVnd, totalVnd: subtotalVnd + platformFeeVnd };
};
