/** Mirror server report.types.ts (SRCH-007, ADM-010). */

export const REPORT_TARGET_TYPES = ['creator', 'package'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  'fake_profile',
  'inappropriate_content',
  'spam',
  'misleading_price',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface Report {
  readonly id: string;
  readonly targetType: ReportTargetType;
  readonly targetId: string;
  readonly reason: ReportReason;
  readonly description: string;
  readonly reporterUserId: string | null;
  readonly status: ReportStatus;
  readonly resolutionNote: string | null;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

export interface CreateReportInput {
  readonly targetType: ReportTargetType;
  readonly targetId: string;
  readonly reason: ReportReason;
  readonly description: string;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  fake_profile: 'Hồ sơ giả mạo',
  inappropriate_content: 'Nội dung không phù hợp',
  spam: 'Spam / làm phiền',
  misleading_price: 'Giá gây hiểu nhầm',
  other: 'Lý do khác',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Chờ xử lý',
  resolved: 'Đã xử lý',
  dismissed: 'Đã bỏ qua',
};

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  creator: 'Creator',
  package: 'Package',
};
