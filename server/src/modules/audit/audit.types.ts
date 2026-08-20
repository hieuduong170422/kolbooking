/**
 * Loại đối tượng bị tác động — một nguồn sự thật cho cả nơi GHI lẫn bộ lọc
 * của màn xem audit. Trước đây bộ lọc liệt kê tay và thiếu booking/report/
 * conversation, nên admin lọc đúng loại lại nhận 400 dù log có thật.
 *
 * Thêm loại mới ở đây trước, rồi mới dùng ở service.
 */
export const AUDIT_TARGET_TYPES = [
  'user',
  'creator',
  'brand',
  'package',
  'booking',
  'conversation',
  'report',
] as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

/**
 * AuditLog (SRS §10.1) — lịch sử bất biến của mọi thao tác quan trọng.
 * Chỉ ghi actor/action/target/reason — KHÔNG bao giờ chứa password, token hay OTP.
 */
export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  before: unknown | null;
  after: unknown | null;
  reason: string | null;
  createdAt: string;
}

export type CreateAuditEntryInput = Omit<AuditEntry, 'id' | 'createdAt'>;
