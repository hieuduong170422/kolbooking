import { Router, type Request, type Response } from 'express';
import { env } from '../../config/env.js';
import { sendOk } from '../../shared/http/api-response.js';
import { FAST_DELIVERY_TURNAROUND_DAYS } from '../bookings/booking.deadline.js';

/** Những con số client được phép biết để ước tính trước — không có gì nhạy cảm. */
export interface PublicConfig {
  readonly platformFeePercent: number;
  readonly platformFeeMinVnd: number;
  readonly fastDeliveryTurnaroundDays: number;
  readonly termsVersion: string;
}

/**
 * Cấu hình công khai, chỉ đọc.
 *
 * Lý do tồn tại: client cần hiện phí nền tảng ngay trong khối Tạm tính (brand
 * phải thấy tổng tiền TRƯỚC khi bấm tạo booking) và cần biết add-on giao nhanh
 * rút deadline còn bao nhiêu ngày. Không có endpoint này thì client phải chép
 * cứng các con số đó và sẽ lệch với server ngay lần đầu đổi cấu hình.
 */
export const createConfigRouter = (): Router => {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config: PublicConfig = {
      platformFeePercent: env.PLATFORM_FEE_PERCENT,
      platformFeeMinVnd: env.PLATFORM_FEE_MIN_VND,
      fastDeliveryTurnaroundDays: FAST_DELIVERY_TURNAROUND_DAYS,
      termsVersion: env.TERMS_VERSION,
    };
    sendOk(res, config);
  });

  return router;
};
