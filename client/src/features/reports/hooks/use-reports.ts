import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createReport, fetchReports, resolveReport } from '../api/reports-api';
import type { ReportStatus } from '../types/report-types';

/** Gửi báo cáo — không invalidate gì phía công khai, chỉ dùng trạng thái mutation. */
export const useCreateReport = () => useMutation({ mutationFn: createReport });

export const useReports = (filter: { status: ReportStatus; page: number; limit: number }) =>
  useQuery({
    queryKey: ['admin', 'reports', filter] as const,
    queryFn: () => fetchReports(filter),
  });

export const useResolveReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      ...input
    }: {
      reportId: string;
      status: 'resolved' | 'dismissed';
      note: string;
    }) => resolveReport(reportId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
};
