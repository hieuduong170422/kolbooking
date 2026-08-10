import { randomUUID } from 'node:crypto';
import type { ReportRepository } from './report.repository.js';
import type {
  CreateReportInput,
  Report,
  ReportListFilter,
  ReportListResult,
  ReportStatus,
} from './report.types.js';

/** In-memory implementation — bản ghi immutable, cập nhật bằng bản sao mới. */
export class InMemoryReportRepository implements ReportRepository {
  private readonly reportsById = new Map<string, Report>();

  create(input: CreateReportInput): Promise<Report> {
    const report: Report = {
      id: `rpt_${randomUUID().replaceAll('-', '')}`,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description,
      reporterUserId: input.reporterUserId,
      status: 'open',
      resolutionNote: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    this.reportsById.set(report.id, report);
    return Promise.resolve(report);
  }

  findById(id: string): Promise<Report | null> {
    return Promise.resolve(this.reportsById.get(id) ?? null);
  }

  list(filter: ReportListFilter): Promise<ReportListResult> {
    const matched = [...this.reportsById.values()]
      .filter((report) => (filter.status ? report.status === filter.status : true))
      // Cũ nhất lên đầu — ticket chờ lâu phải xử lý trước (SLA, DSP-008).
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const start = (filter.page - 1) * filter.limit;
    return Promise.resolve({
      items: matched.slice(start, start + filter.limit),
      total: matched.length,
    });
  }

  resolve(id: string, status: ReportStatus, note: string): Promise<Report | null> {
    const existing = this.reportsById.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated: Report = {
      ...existing,
      status,
      resolutionNote: note,
      resolvedAt: new Date().toISOString(),
    };
    this.reportsById.set(id, updated);
    return Promise.resolve(updated);
  }
}
