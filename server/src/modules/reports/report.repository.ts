import type {
  CreateReportInput,
  Report,
  ReportListFilter,
  ReportListResult,
  ReportStatus,
} from './report.types.js';

export interface ReportRepository {
  create(input: CreateReportInput): Promise<Report>;
  findById(id: string): Promise<Report | null>;
  list(filter: ReportListFilter): Promise<ReportListResult>;
  /** Đóng ticket — trả bản ghi sau cập nhật, null nếu không tồn tại. */
  resolve(id: string, status: ReportStatus, note: string): Promise<Report | null>;
}
