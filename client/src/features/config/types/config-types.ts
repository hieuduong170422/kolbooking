/** Các con số server cho phép client biết để ước tính trước (GET /config). */
export interface AppConfig {
  readonly platformFeePercent: number;
  readonly platformFeeMinVnd: number;
  readonly fastDeliveryTurnaroundDays: number;
  readonly termsVersion: string;
}

/**
 * Giá trị dùng khi chưa tải được cấu hình — khớp mặc định của server. Có
 * fallback thì mất mạng vẫn hiện được ước tính thay vì để trống khối tiền;
 * số cuối cùng luôn do server chốt (PAY-001).
 */
export const FALLBACK_CONFIG: AppConfig = {
  platformFeePercent: 12,
  platformFeeMinVnd: 50_000,
  fastDeliveryTurnaroundDays: 2,
  termsVersion: '2026-08-mvp',
};
