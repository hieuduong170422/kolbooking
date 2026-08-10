import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditEntries } from '../features/admin/hooks/use-admin';
import type { AuditEntry } from '../features/admin/types/admin-types';
import { AdminAuditPage } from './admin-audit-page';

vi.mock('../features/admin/hooks/use-admin', () => ({ useAuditEntries: vi.fn() }));

const mockUseAudit = vi.mocked(useAuditEntries);

const entryFixture: AuditEntry = {
  id: 'aud_1',
  actorId: 'usr_admin',
  actorEmail: 'admin@demo.vn',
  action: 'user.lock',
  targetType: 'user',
  targetId: 'usr_demo_creator',
  before: 'active',
  after: 'locked',
  reason: 'Spam brand nhiều lần.',
  createdAt: '2026-08-10T09:30:00.000Z',
};

const setup = (entries: readonly AuditEntry[]): void => {
  mockUseAudit.mockReturnValue({
    data: {
      success: true,
      data: entries,
      error: null,
      meta: { page: 1, limit: 25, total: entries.length, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  render(
    <MemoryRouter>
      <AdminAuditPage />
    </MemoryRouter>,
  );
};

describe('AdminAuditPage (ADM-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dịch mã action sang tiếng Việt và hiển thị chuyển trạng thái + lý do', () => {
    setup([entryFixture]);

    expect(screen.getByText('Khóa tài khoản')).toBeInTheDocument();
    expect(screen.getByText('active → locked')).toBeInTheDocument();
    expect(screen.getByText(/admin@demo\.vn/)).toBeInTheDocument();
    expect(screen.getByText(/Spam brand nhiều lần/)).toBeInTheDocument();
  });

  it('action chưa có nhãn thì hiển thị nguyên mã', () => {
    setup([{ ...entryFixture, action: 'booking.confirm', before: null, after: null }]);

    expect(screen.getByText('booking.confirm')).toBeInTheDocument();
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });

  it('lọc theo đối tượng → truyền targetType vào hook', () => {
    setup([entryFixture]);

    fireEvent.change(screen.getByLabelText('Lọc theo đối tượng'), {
      target: { value: 'package' },
    });

    expect(mockUseAudit).toHaveBeenLastCalledWith(
      expect.objectContaining({ targetType: 'package', page: 1 }),
    );
  });

  it('không có bản ghi → hiển thị trạng thái rỗng', () => {
    setup([]);
    expect(screen.getByText('Chưa có thao tác nào được ghi nhận.')).toBeInTheDocument();
  });
});
