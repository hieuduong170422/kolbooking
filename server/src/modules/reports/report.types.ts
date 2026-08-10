/** Đối tượng bị báo cáo (SRCH-007). */
export const REPORT_TARGET_TYPES = ['creator', 'package'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/** Nhóm lý do — cố định để Operations lọc và thống kê được (ADM-010). */
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

/** Moderation ticket — mỗi report là một ticket cho Operations xử lý. */
export interface Report {
  readonly id: string;
  readonly targetType: ReportTargetType;
  readonly targetId: string;
  readonly reason: ReportReason;
  readonly description: string;
  /** null khi guest báo cáo (chưa đăng nhập). */
  readonly reporterUserId: string | null;
  readonly status: ReportStatus;
  /** Ghi chú của admin khi đóng ticket. */
  readonly resolutionNote: string | null;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

export type CreateReportInput = Pick<
  Report,
  'targetType' | 'targetId' | 'reason' | 'description' | 'reporterUserId'
>;

export interface ReportListFilter {
  readonly status?: ReportStatus | undefined;
  readonly page: number;
  readonly limit: number;
}

export interface ReportListResult {
  readonly items: readonly Report[];
  readonly total: number;
}
