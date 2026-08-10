import { ApiError } from '../../shared/errors/api-error.js';
import type { Booking } from './booking.types.js';

/** Danh tính người gọi khi kiểm tra quyền trên một booking. */
export interface BookingParticipant {
  readonly userId: string;
  readonly role: 'brand' | 'creator' | 'admin' | 'system';
  /** creatorId hồ sơ — chỉ có khi role = creator. */
  readonly creatorId?: string | undefined;
}

export const isBookingParticipant = (
  booking: Booking,
  actor: BookingParticipant,
): boolean => {
  if (actor.role === 'admin' || actor.role === 'system') return true;
  if (booking.brandUserId === actor.userId) return true;
  return actor.creatorId !== undefined && booking.creatorId === actor.creatorId;
};

/**
 * Object-level authorization dùng chung cho booking, chat và mọi thứ gắn
 * với booking (SEC-003, AC-09, CHAT-001).
 *
 * Người ngoài nhận 404 chứ không phải 403 — không tiết lộ booking có tồn
 * tại hay không.
 */
export const assertBookingAccess = (booking: Booking, actor: BookingParticipant): void => {
  if (!isBookingParticipant(booking, actor)) {
    throw ApiError.notFound('Không tìm thấy booking này.');
  }
};
