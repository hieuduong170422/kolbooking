import type { Booking, BookingListFilter, BookingListResult } from './booking.types.js';

export interface BookingRepository {
  create(input: Booking): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  findByCode(code: string): Promise<Booking | null>;
  /** Full replace — null khi không tồn tại. */
  update(id: string, input: Booking): Promise<Booking | null>;
  /** Booking của một brand (theo userId). */
  findByBrand(brandUserId: string, filter: BookingListFilter): Promise<BookingListResult>;
  /** Booking của một creator (theo creatorId hồ sơ). */
  findByCreator(creatorId: string, filter: BookingListFilter): Promise<BookingListResult>;
  /** Mọi booking — chỉ admin dùng (ADM-005). */
  findAll(filter: BookingListFilter): Promise<BookingListResult>;
  /** Booking quá hạn phản hồi/thanh toán — scheduler quét (BKG-005). */
  findExpired(now: string): Promise<readonly Booking[]>;
}
