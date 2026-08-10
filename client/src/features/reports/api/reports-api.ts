import { apiGet, apiPost } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import type { CreateReportInput, Report, ReportStatus } from '../types/report-types';

/** Gửi báo cáo vi phạm từ trang công khai (SRCH-007). */
export const createReport = async (input: CreateReportInput): Promise<Report> => {
  const response = await apiPost<{ report: Report }>('/reports', input);
  return response.data.report;
};

/** Queue moderation của admin — giữ envelope để lấy meta phân trang (ADM-010). */
export const fetchReports = (filter: {
  status: ReportStatus;
  page: number;
  limit: number;
}): Promise<ApiSuccessBody<readonly Report[]>> =>
  apiGet<readonly Report[]>('/reports', {
    status: filter.status,
    page: filter.page,
    limit: filter.limit,
  });

export const resolveReport = async (
  reportId: string,
  input: { status: 'resolved' | 'dismissed'; note: string },
): Promise<Report> => {
  const response = await apiPost<{ report: Report }>(`/reports/${reportId}/resolve`, input);
  return response.data.report;
};
