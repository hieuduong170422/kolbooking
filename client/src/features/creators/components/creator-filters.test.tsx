import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CreatorListFilter } from '../types/creator-types';
import { CreatorFilters } from './creator-filters';

const baseFilter: CreatorListFilter = { page: 1, limit: 12, sort: 'rating' };

/** Danh sách nằm trong lớp nổi — phải mở dropdown trước khi chọn. */
const openDropdown = (name: string): void => {
  fireEvent.click(screen.getByRole('combobox', { name }));
};

describe('CreatorFilters (SRCH-003)', () => {
  it('thay đổi serviceMode → onChange với filter mới + reset về trang 1 (SRCH-003)', () => {
    const onChange = vi.fn();
    render(<CreatorFilters filter={baseFilter} onChange={onChange} />);

    openDropdown('Hình thức nhận việc');
    fireEvent.click(screen.getByRole('option', { name: 'Online' }));

    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, serviceMode: 'online', page: 1 });
  });

  it('chọn "Tất cả hình thức" → serviceMode undefined (SRCH-003)', () => {
    const onChange = vi.fn();
    render(<CreatorFilters filter={{ ...baseFilter, serviceMode: 'both' }} onChange={onChange} />);

    openDropdown('Hình thức nhận việc');
    fireEvent.click(screen.getByRole('option', { name: 'Tất cả hình thức' }));

    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, serviceMode: undefined, page: 1 });
  });

  it('dropdown serviceMode hiển thị đủ 3 lựa chọn từ SERVICE_MODES (SRCH-003)', () => {
    render(<CreatorFilters filter={baseFilter} onChange={vi.fn()} />);

    openDropdown('Hình thức nhận việc');

    expect(screen.getByRole('option', { name: 'Online' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Offline' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Online & Offline' })).toBeInTheDocument();
  });

  it('search vẫn gọi onChange — không đổi semantic cũ (SRCH)', () => {
    const onChange = vi.fn();
    render(<CreatorFilters filter={baseFilter} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Tìm kiếm creator'), { target: { value: 'cafe' } });

    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, search: 'cafe', page: 1 });
  });

  it('creatorType vẫn gọi onChange — không đổi semantic cũ (SRCH)', () => {
    const onChange = vi.fn();
    render(<CreatorFilters filter={baseFilter} onChange={onChange} />);

    // Loại creator giờ là nhóm nút toggle (bấm lại để bỏ chọn), không phải <select>.
    fireEvent.click(screen.getByRole('button', { name: 'KOC' }));

    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, creatorType: 'koc', page: 1 });
  });

  it('thay đổi thành phố → onChange với city + reset về trang 1 (SRCH-003)', () => {
    const onChange = vi.fn();
    render(<CreatorFilters filter={baseFilter} onChange={onChange} />);

    openDropdown('Thành phố');
    fireEvent.click(screen.getByRole('option', { name: 'Hồ Chí Minh' }));

    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, city: 'Hồ Chí Minh', page: 1 });
  });

  it('chọn "Tất cả thành phố" → city undefined (SRCH-003)', () => {
    const onChange = vi.fn();
    render(<CreatorFilters filter={{ ...baseFilter, city: 'Hà Nội' }} onChange={onChange} />);

    openDropdown('Thành phố');
    fireEvent.click(screen.getByRole('option', { name: 'Tất cả thành phố' }));

    expect(onChange).toHaveBeenCalledWith({ ...baseFilter, city: undefined, page: 1 });
  });

  it('dropdown thành phố hiển thị danh sách thành phố phổ biến (SRCH-003)', () => {
    render(<CreatorFilters filter={baseFilter} onChange={vi.fn()} />);

    openDropdown('Thành phố');

    expect(screen.getByRole('option', { name: 'Tất cả thành phố' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hà Nội' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hồ Chí Minh' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Đà Nẵng' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cần Thơ' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hải Phòng' })).toBeInTheDocument();
  });
});
