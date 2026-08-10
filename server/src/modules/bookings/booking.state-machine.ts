import { ApiError } from '../../shared/errors/api-error.js';
import type { BookingStatus } from './booking.types.js';

/** Ai được phép kích hoạt transition. `system` dành cho scheduler hết hạn. */
export type BookingActorRole = 'brand' | 'creator' | 'admin' | 'system';

export const BOOKING_ACTIONS = [
  'send',
  'accept',
  'reject',
  'propose_change',
  'confirm_payment',
  'start_work',
  'cancel',
  'expire',
] as const;
export type BookingAction = (typeof BOOKING_ACTIONS)[number];

export interface TransitionRule {
  readonly from: readonly BookingStatus[];
  readonly to: BookingStatus;
  readonly actors: readonly BookingActorRole[];
  /** BR-014 mở rộng: từ chối/đề nghị đổi/hủy phải nêu lý do. */
  readonly requiresReason: boolean;
  /** Đặt hạn phản hồi mới sau transition (giờ); null = xóa hạn. */
  readonly expiresInHours: number | null;
}

/**
 * Bảng transition (SRS §9.2) — nguồn sự thật DUY NHẤT cho vòng đời booking.
 * Client không bao giờ tự đặt status; mọi thay đổi phải khớp một dòng ở đây.
 *
 * P3 phủ tới CONFIRMED/IN_PROGRESS. Các nhánh nộp bài (DELIVERED trở đi),
 * dispute và refund sẽ thêm dòng mới ở phase Fulfillment/Payment — cấu trúc
 * này cho phép mở rộng mà không sửa logic đã có.
 */
export const TRANSITIONS: Readonly<Record<BookingAction, TransitionRule>> = Object.freeze({
  // Brand gửi yêu cầu cho creator (BKG-001).
  send: {
    from: ['draft'],
    to: 'pending_creator',
    actors: ['brand'],
    requiresReason: false,
    expiresInHours: 72,
  },
  // Creator đồng ý → khóa điều khoản, chờ brand trả tiền (BKG-004, BKG-006).
  accept: {
    from: ['pending_creator'],
    to: 'awaiting_payment',
    actors: ['creator'],
    requiresReason: false,
    expiresInHours: 48,
  },
  reject: {
    from: ['pending_creator'],
    to: 'cancelled',
    actors: ['creator'],
    requiresReason: true,
    expiresInHours: null,
  },
  // Đề nghị thay đổi đưa booking về nháp để brand sửa brief rồi gửi lại (BKG-004).
  propose_change: {
    from: ['pending_creator'],
    to: 'draft',
    actors: ['creator'],
    requiresReason: true,
    expiresInHours: null,
  },
  /**
   * P3 xác nhận thanh toán THỦ CÔNG do Operations (fallback hợp lệ theo SRS §11).
   * P6 thay bằng webhook provider đã verify — chỉ đổi actor, không đổi transition.
   */
  confirm_payment: {
    from: ['awaiting_payment'],
    to: 'confirmed',
    actors: ['admin'],
    requiresReason: false,
    expiresInHours: null,
  },
  start_work: {
    from: ['confirmed'],
    to: 'in_progress',
    actors: ['creator'],
    requiresReason: false,
    expiresInHours: null,
  },
  // Hủy trước khi thanh toán: không phí, không ledger (DSP-002).
  cancel: {
    from: ['draft', 'pending_creator', 'awaiting_payment'],
    to: 'cancelled',
    actors: ['brand'],
    requiresReason: true,
    expiresInHours: null,
  },
  // Creator không phản hồi / brand không trả tiền đúng hạn (BKG-005, BR-005).
  expire: {
    from: ['pending_creator', 'awaiting_payment'],
    to: 'expired',
    actors: ['system'],
    requiresReason: false,
    expiresInHours: null,
  },
});

/**
 * Kiểm tra một transition có hợp lệ không và trả về rule.
 * Sai trạng thái → 409, sai vai trò → 403, thiếu lý do → 400.
 */
export const resolveTransition = (
  action: BookingAction,
  currentStatus: BookingStatus,
  actorRole: BookingActorRole,
  reason: string | undefined,
): TransitionRule => {
  const rule = TRANSITIONS[action];

  if (!rule.actors.includes(actorRole)) {
    throw ApiError.forbidden(`Vai trò ${actorRole} không được phép thực hiện thao tác này.`);
  }
  if (!rule.from.includes(currentStatus)) {
    throw ApiError.conflict(
      `Không thể ${action} khi booking đang ở trạng thái ${currentStatus}.`,
    );
  }
  if (rule.requiresReason && (reason === undefined || reason.trim().length === 0)) {
    throw ApiError.badRequest('Thao tác này bắt buộc nêu lý do.');
  }

  return rule;
};

/** Trạng thái đã đóng — không còn transition nào đi tiếp. */
export const isTerminalStatus = (status: BookingStatus): boolean =>
  status === 'cancelled' || status === 'expired' || status === 'refunded';
