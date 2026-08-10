import type { SocialPlatform } from '../creators/creator.types.js';
import type {
  PackageAddOn,
  PackageDeliverable,
  UsageRights,
} from '../packages/package.types.js';

/**
 * Vòng đời booking (SRS §9.1) — 13 trạng thái.
 * P3 hiện thực tới CONFIRMED + các nhánh hủy/hết hạn; DELIVERED trở đi
 * thuộc phase Fulfillment nhưng vẫn khai báo sẵn để bảng transition đủ.
 */
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

/** Brief có cấu trúc (BKG-002) — lưu version, không sửa tại chỗ. */
export interface BookingBrief {
  readonly objective: string;
  readonly keyMessage: string;
  readonly mustHaveScenes: readonly string[];
  readonly prohibited: readonly string[];
  readonly references: readonly string[];
  /** ISO date brand mong muốn nhận bài. */
  readonly desiredDeadline: string;
  readonly version: number;
}

/** Dòng tiền của booking — mọi số tính phía server, đơn vị VND (BR-004). */
export interface BookingTotals {
  readonly packagePriceVnd: number;
  readonly addOnsTotalVnd: number;
  /** Phí nền tảng brand trả thêm; creator nhận đúng giá niêm yết (SRS §2.4). */
  readonly platformFeeVnd: number;
  readonly totalVnd: number;
  /** Số creator thực nhận khi settlement (P6). */
  readonly creatorEarningsVnd: number;
}

/**
 * Bản khóa điều khoản tại thời điểm hai bên đồng ý (BKG-006, BR-003).
 * Sửa package sau đó KHÔNG làm đổi booking đã chốt.
 */
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

/** Một mốc trong dòng thời gian booking — dựng UI và phục vụ phân xử (BKG-008). */
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
  /** Mã tra cứu KB-YYMMDD-XXXX, duy nhất, hiện ở mọi màn (BKG-011). */
  readonly code: string;
  readonly brandUserId: string;
  readonly creatorId: string;
  readonly creatorUserId: string | null;
  readonly packageId: string;
  readonly status: BookingStatus;
  readonly brief: BookingBrief;
  readonly selectedAddOnIds: readonly string[];
  readonly totals: BookingTotals;
  /** null cho tới khi creator chấp nhận — lúc đó điều khoản được khóa. */
  readonly snapshot: BookingSnapshot | null;
  /** Lý do hủy/từ chối/đề nghị thay đổi gần nhất. */
  readonly statusReason: string | null;
  /** Hạn phản hồi/thanh toán; quá hạn scheduler chuyển EXPIRED (BKG-005, BR-005). */
  readonly expiresAt: string | null;
  readonly timeline: readonly BookingEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Input tạo booking — brand chọn package + add-on rồi nhập brief. */
export interface CreateBookingInput {
  readonly brandUserId: string;
  readonly creatorId: string;
  readonly packageId: string;
  readonly selectedAddOnIds: readonly string[];
  readonly brief: Omit<BookingBrief, 'version'>;
}

export interface BookingListFilter {
  readonly status?: BookingStatus | undefined;
  readonly page: number;
  readonly limit: number;
}

export interface BookingListResult {
  readonly items: readonly Booking[];
  readonly total: number;
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
