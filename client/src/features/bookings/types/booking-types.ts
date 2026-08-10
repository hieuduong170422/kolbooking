import type { SocialPlatform } from '../../creators/types/creator-types';
import type { PackageAddOn, PackageDeliverable, UsageRights } from '../../packages/types/package-types';

/** Mirror server booking.types.ts (SRS §9.1). */
export const BOOKING_STATUSES = [
  'draft',
  'pending_creator',
  'awaiting_payment',
  'confirmed',
  'in_progress',
  'delivered',
  'revision_requested',
  'approved',
  'completed',
  'disputed',
  'cancelled',
  'refunded',
  'expired',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_ACTIONS = [
  'send',
  'accept',
  'reject',
  'propose_change',
  'confirm_payment',
  'start_work',
  'approve',
  'complete',
  'cancel',
] as const;
export type BookingAction = (typeof BOOKING_ACTIONS)[number];

export interface BookingBrief {
  readonly objective: string;
  readonly keyMessage: string;
  readonly mustHaveScenes: readonly string[];
  readonly prohibited: readonly string[];
  readonly references: readonly string[];
  readonly desiredDeadline: string;
  readonly version: number;
}

export interface BookingTotals {
  readonly packagePriceVnd: number;
  readonly addOnsTotalVnd: number;
  readonly platformFeeVnd: number;
  readonly totalVnd: number;
  readonly creatorEarningsVnd: number;
}

export interface BookingSnapshot {
  readonly packageId: string;
  readonly packageVersion: number;
  readonly packageName: string;
  readonly platforms: readonly SocialPlatform[];
  readonly deliverables: readonly PackageDeliverable[];
  readonly usageRights: UsageRights;
  readonly turnaroundDays: number;
  readonly revisionsIncluded: number;
  readonly selectedAddOns: readonly PackageAddOn[];
  readonly totals: BookingTotals;
  readonly brief: BookingBrief;
  readonly lockedAt: string;
}

export interface BookingEvent {
  readonly at: string;
  readonly actorUserId: string | null;
  readonly action: string;
  readonly fromStatus: BookingStatus | null;
  readonly toStatus: BookingStatus;
  readonly note: string | null;
}

export interface Booking {
  readonly id: string;
  readonly code: string;
  readonly brandUserId: string;
  readonly creatorId: string;
  readonly creatorUserId: string | null;
  readonly packageId: string;
  readonly status: BookingStatus;
  readonly brief: BookingBrief;
  readonly selectedAddOnIds: readonly string[];
  readonly totals: BookingTotals;
  readonly snapshot: BookingSnapshot | null;
  readonly statusReason: string | null;
  readonly expiresAt: string | null;
  readonly timeline: readonly BookingEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateBookingInput {
  readonly creatorId: string;
  readonly packageId: string;
  readonly selectedAddOnIds: readonly string[];
  readonly brief: Omit<BookingBrief, 'version'>;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  draft: 'Nháp',
  pending_creator: 'Chờ creator phản hồi',
  awaiting_payment: 'Chờ thanh toán',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang sản xuất',
  delivered: 'Đã nộp bài',
  revision_requested: 'Yêu cầu sửa',
  approved: 'Đã nghiệm thu',
  completed: 'Hoàn tất',
  disputed: 'Đang tranh chấp',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  expired: 'Hết hạn',
};

/** 13 trạng thái gom về 5 họ màu để người dùng học một lần (design concept). */
export const BOOKING_STATUS_TONE: Record<BookingStatus, string> = {
  draft: 'mute',
  pending_creator: 'wait',
  awaiting_payment: 'wait',
  revision_requested: 'wait',
  confirmed: 'info',
  delivered: 'info',
  in_progress: 'run',
  approved: 'good',
  completed: 'good',
  disputed: 'bad',
  cancelled: 'mute',
  refunded: 'mute',
  expired: 'mute',
};

export const BOOKING_ACTION_LABELS: Record<BookingAction, string> = {
  send: 'Gửi yêu cầu cho creator',
  accept: 'Chấp nhận booking',
  reject: 'Từ chối',
  propose_change: 'Đề nghị thay đổi',
  confirm_payment: 'Xác nhận đã thanh toán',
  start_work: 'Bắt đầu sản xuất',
  approve: 'Nghiệm thu nội dung',
  complete: 'Chốt hoàn tất',
  cancel: 'Hủy booking',
};

/** Action bắt buộc nêu lý do — khớp transition table phía server. */
export const ACTIONS_REQUIRING_REASON: readonly BookingAction[] = [
  'reject',
  'propose_change',
  'cancel',
];
