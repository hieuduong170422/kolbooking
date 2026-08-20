import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrivacyPage } from './privacy-page';
import { TermsPage } from './terms-page';
import { FALLBACK_CONFIG } from '../features/config/types/config-types';

vi.mock('../features/config/hooks/use-app-config', () => ({
  useAppConfig: () => FALLBACK_CONFIG,
}));

/**
 * A2 của báo cáo kiểm thử 20/08/2026: form đăng ký ép tick đồng ý nhưng cả
 * hai link đều dẫn tới 404. Test này giữ cho hai trang không biến mất lần nữa.
 */
describe('Trang Điều khoản', () => {
  it('hiện tiêu đề, phiên bản đang áp dụng và các mục chính', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Điều khoản sử dụng' })).toBeInTheDocument();
    expect(screen.getByText(/Phiên bản 2026-08-mvp/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Giá, phí nền tảng và thanh toán/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tranh chấp/ })).toBeInTheDocument();
  });

  it('nói đúng cơ chế giữ tiền đang chạy trong sản phẩm', () => {
    render(<TermsPage />);
    expect(screen.getByText(/chỉ giải ngân cho creator sau khi brand nghiệm thu/)).toBeInTheDocument();
  });
});

describe('Trang Chính sách quyền riêng tư', () => {
  it('hiện tiêu đề và các mục bắt buộc', () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Chính sách quyền riêng tư' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Dữ liệu chúng tôi thu thập/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Quyền của bạn/ })).toBeInTheDocument();
  });

  it('nói rõ mật khẩu chỉ lưu dạng băm — khớp với password.service', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/Mật khẩu chỉ được lưu dưới dạng băm/)).toBeInTheDocument();
  });
});
