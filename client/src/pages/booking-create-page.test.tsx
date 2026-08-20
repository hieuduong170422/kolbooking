import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateBooking } from '../features/bookings/hooks/use-bookings';
import { usePackagesByCreator } from '../features/packages/hooks/use-public-packages';
import { FALLBACK_CONFIG } from '../features/config/types/config-types';
import { BookingCreatePage } from './booking-create-page';

vi.mock('../features/bookings/hooks/use-bookings', () => ({ useCreateBooking: vi.fn() }));
vi.mock('../features/packages/hooks/use-public-packages', () => ({
  usePackagesByCreator: vi.fn(),
}));
// Cấu hình công khai gọi API thật qua React Query — trang chỉ cần các con số,
// mock thẳng về mặc định để test không phải dựng QueryClientProvider.
vi.mock('../features/config/hooks/use-app-config', () => ({
  useAppConfig: () => FALLBACK_CONFIG,
}));

const mockUsePackages = vi.mocked(usePackagesByCreator);
const mockUseCreateBooking = vi.mocked(useCreateBooking);

const packageFixture = {
  id: 'pkg_1',
  creatorId: 'crt_1',
  name: 'Video review 60s',
  category: 'f&b',
  platforms: ['tiktok'],
  description: 'Một video review chuẩn TikTok',
  coverImageUrl: null,
  deliverables: [],
  priceVnd: 3_000_000,
  turnaroundDays: 5,
  revisionsIncluded: 1,
  usageRights: { repost: true, paidAds: false, durationMonths: 3, channels: ['tiktok'] },
  postDurationDays: 30,
  addOns: [
    { id: 'ado_1', type: 'fast_delivery', label: 'Giao nhanh 48h', priceVnd: 300_000 },
  ],
};

const mutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePackages.mockReturnValue({
    data: { data: [packageFixture] },
    isPending: false,
    isError: false,
  } as never);
  mockUseCreateBooking.mockReturnValue({ mutate, isPending: false, error: null } as never);
});

const renderPage = (): void => {
  render(
    <MemoryRouter initialEntries={['/creators/crt_1/book?package=pkg_1']}>
      <Routes>
        <Route path="/creators/:id/book" element={<BookingCreatePage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('BookingCreatePage — brief có gợi ý dựng sẵn (BKG-002)', () => {
  it('chọn mục tiêu thì điền sẵn bản nháp và gợi ý cảnh/điều cấm', () => {
    renderPage();

    fireEvent.click(screen.getByLabelText('Ra mắt sản phẩm mới'));

    // Ô mục tiêu không còn trống — brand sửa bản nháp thay vì tự nghĩ từ đầu.
    expect((screen.getByLabelText('Mô tả mục tiêu') as HTMLTextAreaElement).value).toContain(
      'Giới thiệu sản phẩm mới',
    );
    // Mục được điền sẵn hiện thành thẻ có dấu × ngay dưới dropdown.
    expect(screen.getByRole('button', { name: 'Bỏ Cận cảnh sản phẩm' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Bỏ Không so sánh trực tiếp với đối thủ' }),
    ).toBeInTheDocument();
  });

  it('không ghi đè mục tiêu người dùng đã tự viết', () => {
    renderPage();
    const objective = screen.getByLabelText('Mô tả mục tiêu');

    fireEvent.change(objective, { target: { value: 'Nội dung tôi tự viết cho chiến dịch.' } });
    fireEvent.click(screen.getByLabelText('Tăng nhận diện thương hiệu'));

    expect((objective as HTMLTextAreaElement).value).toBe('Nội dung tôi tự viết cho chiến dịch.');
  });

  it('đổi mục tiêu chỉ thêm gợi ý, không xoá lựa chọn đang có', () => {
    renderPage();

    fireEvent.click(screen.getByLabelText('Ra mắt sản phẩm mới'));
    fireEvent.click(screen.getByLabelText('Tăng nhận diện thương hiệu'));

    expect(screen.getByRole('button', { name: 'Bỏ Cận cảnh sản phẩm' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Bỏ Logo hoặc biển hiệu xuất hiện rõ' }),
    ).toBeInTheDocument();
  });

  it('gợi ý cảnh bám theo lĩnh vực của gói', () => {
    renderPage();

    fireEvent.click(screen.getByRole('combobox', { name: 'Cảnh bắt buộc' }));

    expect(screen.getByRole('option', { name: 'Cận cảnh món ăn/đồ uống' })).toBeInTheDocument();
  });

  it('chặn deadline sớm hơn thời gian sản xuất của gói', () => {
    renderPage();

    const deadline = screen.getByLabelText('Deadline mong muốn') as HTMLInputElement;
    const earliest = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    expect(deadline.min).toBe(earliest);
    expect(screen.getByText(/cần 5 ngày sản xuất/)).toBeInTheDocument();
  });

  it('khối Tạm tính hiện phí nền tảng và tổng brand phải trả', () => {
    renderPage();

    // 3.000.000 + 12% = 3.360.000 — brand thấy TRƯỚC khi bấm tạo, không phải
    // sau khi đã có booking nháp.
    expect(screen.getByText('Phí nền tảng (12%)')).toBeInTheDocument();
    expect(screen.getByText(/^360\.000/)).toBeInTheDocument();
    expect(screen.getByText('Bạn trả')).toBeInTheDocument();
    expect(screen.getByText(/^3\.360\.000/)).toBeInTheDocument();
  });

  it('add-on giao nhanh kéo ngày sớm nhất từ 5 ngày xuống 2 ngày', () => {
    renderPage();
    const deadline = screen.getByLabelText('Deadline mong muốn') as HTMLInputElement;

    fireEvent.click(screen.getByLabelText(/Giao nhanh 48h/));

    const rushed = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(deadline.min).toBe(rushed);
    expect(screen.getByText(/add-on giao nhanh/i)).toBeInTheDocument();
  });

  it('bỏ add-on giao nhanh sau khi đã chọn ngày → báo lỗi thay vì để server từ chối', () => {
    renderPage();
    const rushLabel = screen.getByLabelText(/Giao nhanh 48h/);

    fireEvent.click(rushLabel);
    const rushed = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText('Deadline mong muốn'), { target: { value: rushed } });
    fireEvent.click(rushLabel);

    expect(screen.getByText(/Chọn từ ngày .* trở đi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo yêu cầu booking' })).toBeDisabled();
  });

  it('gửi brief dưới dạng danh sách, không phải chuỗi nhiều dòng', () => {
    renderPage();

    fireEvent.click(screen.getByLabelText('Ra mắt sản phẩm mới'));
    fireEvent.change(screen.getByLabelText('Key message'), {
      target: { value: 'Trà sữa ít đường mới' },
    });
    fireEvent.change(screen.getByLabelText('Deadline mong muốn'), {
      target: { value: '2026-12-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo yêu cầu booking' }));

    expect(mutate).toHaveBeenCalledTimes(1);
    const payload = mutate.mock.calls[0]?.[0] as { brief: Record<string, unknown> };
    expect(payload.brief.mustHaveScenes).toEqual(
      expect.arrayContaining(['Cận cảnh sản phẩm']),
    );
    expect(Array.isArray(payload.brief.prohibited)).toBe(true);
    expect(payload.brief.references).toEqual([]);
  });
});
