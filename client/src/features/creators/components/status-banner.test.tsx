import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CreatorStatus } from '../types/creator-types';
import { StatusBanner } from './status-banner';

/** Render banner với status + statusReason — helper cho 6 trạng thái (CRE-007). */
const renderBanner = (status: CreatorStatus, statusReason: string | null): void => {
  render(<StatusBanner status={status} statusReason={statusReason} />);
};

describe('StatusBanner (CRE-007)', () => {
  it('draft → hiển thị nhắc hoàn thiện, không kèm lý do', () => {
    renderBanner('draft', 'lý do không liên quan');

    expect(screen.getByText('Bản nháp — hoàn thiện và gửi duyệt')).toBeInTheDocument();
    expect(screen.queryByText(/lý do không liên quan/)).not.toBeInTheDocument();
  });

  it('pending_review → Đang chờ duyệt, không kèm lý do', () => {
    renderBanner('pending_review', 'lý do không liên quan');

    expect(screen.getByText('Đang chờ duyệt')).toBeInTheDocument();
    expect(screen.queryByText(/lý do không liên quan/)).not.toBeInTheDocument();
  });

  it('info_required → Cần bổ sung kèm statusReason (CRE-007)', () => {
    renderBanner('info_required', 'Thiếu ảnh đại diện');

    expect(screen.getByText('Cần bổ sung: Thiếu ảnh đại diện')).toBeInTheDocument();
  });

  it('rejected → Bị từ chối kèm statusReason (CRE-007)', () => {
    renderBanner('rejected', 'Vi phạm chính sách');

    expect(screen.getByText('Bị từ chối: Vi phạm chính sách')).toBeInTheDocument();
  });

  it('verified → Đã duyệt, không kèm lý do', () => {
    renderBanner('verified', 'lý do không liên quan');

    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
    expect(screen.queryByText(/lý do không liên quan/)).not.toBeInTheDocument();
  });

  it('suspended → Tạm khóa kèm statusReason (CRE-007)', () => {
    renderBanner('suspended', 'Vi phạm hợp đồng');

    expect(screen.getByText('Tạm khóa: Vi phạm hợp đồng')).toBeInTheDocument();
  });

  it('trạng thái cần lý do nhưng statusReason null → chỉ hiển thị text gốc', () => {
    renderBanner('rejected', null);

    expect(screen.getByText('Bị từ chối')).toBeInTheDocument();
  });

  it('gắn CSS variant theo trạng thái (status-banner status-banner--danger)', () => {
    renderBanner('rejected', null);

    const banner = screen.getByText('Bị từ chối');
    expect(banner.className).toContain('status-banner');
    expect(banner.className).toContain('status-banner--danger');
  });
});
