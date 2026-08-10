import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReports, useResolveReport } from '../features/reports/hooks/use-reports';
import type { Report } from '../features/reports/types/report-types';
import { AdminReportsPage } from './admin-reports-page';

vi.mock('../features/reports/hooks/use-reports', () => ({
  useReports: vi.fn(),
  useResolveReport: vi.fn(),
}));

const mockUseReports = vi.mocked(useReports);
const mockUseResolve = vi.mocked(useResolveReport);
const resolveMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

const makeReport = (overrides: Partial<Report> = {}): Report => ({
  id: 'rpt_1',
  targetType: 'creator',
  targetId: 'crt_0001',
  reason: 'misleading_price',
  description: 'Giá niêm yết khác giá creator báo khi trao đổi.',
  reporterUserId: 'usr_1',
  status: 'open',
  resolutionNote: null,
  createdAt: '2026-08-10T00:00:00.000Z',
  resolvedAt: null,
  ...overrides,
});

const setup = (reports: readonly Report[]): void => {
  mockUseReports.mockReturnValue({
    data: {
      success: true,
      data: reports,
      error: null,
      meta: { page: 1, limit: 20, total: reports.length, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  mockUseResolve.mockReturnValue(resolveMutation as never);
  render(
    <MemoryRouter>
      <AdminReportsPage />
    </MemoryRouter>,
  );
};

describe('AdminReportsPage (SRCH-007, ADM-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị lý do đã dịch, mô tả và link tới creator bị báo cáo', () => {
    setup([makeReport()]);

    expect(screen.getByText('Giá gây hiểu nhầm')).toBeInTheDocument();
    expect(screen.getByText(/Giá niêm yết khác giá creator/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'crt_0001' })).toHaveAttribute(
      'href',
      '/creators/crt_0001',
    );
  });

  it('ticket package không có link (package nằm trong trang creator)', () => {
    setup([makeReport({ targetType: 'package', targetId: 'pkg_0001' })]);

    expect(screen.queryByRole('link', { name: 'pkg_0001' })).not.toBeInTheDocument();
    expect(screen.getByText('pkg_0001')).toBeInTheDocument();
  });

  it('đóng ticket: modal bắt buộc ghi chú rồi gọi mutation với status resolved', async () => {
    setup([makeReport()]);

    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã xử lý' }));
    const confirm = screen.getByRole('button', { name: 'Xác nhận' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Ghi chú xử lý/), {
      target: { value: 'Đã nhắc creator cập nhật giá.' },
    });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(resolveMutation.mutateAsync).toHaveBeenCalledWith({
        reportId: 'rpt_1',
        status: 'resolved',
        note: 'Đã nhắc creator cập nhật giá.',
      });
    });
  });

  it('ticket đã xử lý hiện ghi chú và không còn nút hành động', () => {
    setup([
      makeReport({ status: 'resolved', resolutionNote: 'Đã nhắc creator cập nhật giá.' }),
    ]);

    expect(screen.getByText(/Ghi chú xử lý:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã xử lý' })).not.toBeInTheDocument();
  });
});
