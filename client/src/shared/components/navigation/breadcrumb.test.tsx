import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Breadcrumb } from './breadcrumb';

const renderCrumb = (props: Parameters<typeof Breadcrumb>[0]) =>
  render(
    <MemoryRouter>
      <Breadcrumb {...props} />
    </MemoryRouter>,
  );

describe('Breadcrumb', () => {
  it('mục cuối là trang hiện tại: không phải link và được đánh dấu aria-current', () => {
    renderCrumb({
      items: [
        { label: 'Khám phá creator', to: '/creators' },
        { label: 'Lan Chi Foodie' },
      ],
    });

    const nav = screen.getByRole('navigation', { name: 'Đường dẫn trang' });
    expect(within(nav).getByRole('link', { name: 'Khám phá creator' })).toHaveAttribute(
      'href',
      '/creators',
    );
    expect(within(nav).queryByRole('link', { name: 'Lan Chi Foodie' })).not.toBeInTheDocument();
    expect(within(nav).getByText('Lan Chi Foodie')).toHaveAttribute('aria-current', 'page');
  });

  it('mục giữa vẫn là link bấm được — đó là điểm khác so với nút "Quay lại"', () => {
    renderCrumb({
      items: [
        { label: 'Khám phá creator', to: '/creators' },
        { label: 'Lan Chi Foodie', to: '/creators/crt_0001' },
        { label: 'Gửi yêu cầu booking' },
      ],
    });

    const nav = screen.getByRole('navigation', { name: 'Đường dẫn trang' });
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
    expect(within(nav).getByRole('link', { name: 'Lan Chi Foodie' })).toHaveAttribute(
      'href',
      '/creators/crt_0001',
    );
  });

  it('dấu phân cách là trang trí — trình đọc màn hình không đọc thành nội dung', () => {
    const { container } = renderCrumb({
      items: [{ label: 'Booking', to: '/bookings' }, { label: 'KB-260820-ABCD' }],
    });

    const separators = container.querySelectorAll('.breadcrumb__sep');
    expect(separators).toHaveLength(1);
    expect(separators[0]).toHaveAttribute('aria-hidden', 'true');
  });
});
