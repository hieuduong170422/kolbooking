import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../features/auth/store/use-auth';
import { useBooking, useBookingActions } from '../features/bookings/hooks/use-bookings';
import type { AuthRole, AuthUser } from '../features/auth/types/auth-types';
import type { Booking, BookingStatus } from '../features/bookings/types/booking-types';
import { BookingDetailPage } from './booking-detail-page';

vi.mock('../features/auth/store/use-auth', () => ({ useAuth: vi.fn() }));
vi.mock('../features/bookings/hooks/use-bookings', () => ({
  useBooking: vi.fn(),
  useBookingActions: vi.fn(),
}));
// Chat là component dữ liệu riêng (cần QueryClient) — test trang này không bao nó.
vi.mock('../features/messages/components/booking-chat', () => ({
  BookingChat: () => <div data-testid="booking-chat" />,
}));
vi.mock('../features/submissions/components/fulfillment-panel', () => ({
  FulfillmentPanel: () => <div data-testid="fulfillment-panel" />,
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseBooking = vi.mocked(useBooking);
const mockUseActions = vi.mocked(useBookingActions);
const transitionMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'bkg_1',
  code: 'KB-260810-A7K2',
  brandUserId: 'usr_brand',
  creatorId: 'crt_0001',
  creatorUserId: 'usr_creator',
  packageId: 'pkg_0001',
  status: 'pending_creator',
  brief: {
    objective: 'Giới thiệu món mới cho quán cà phê.',
    keyMessage: 'Cà phê muối vị mới.',
    mustHaveScenes: ['Cảnh quay không gian quán'],
    prohibited: ['Không nhắc đối thủ'],
    references: [],
    desiredDeadline: '2026-09-01T00:00:00.000Z',
    version: 1,
  },
  selectedAddOnIds: [],
  totals: {
    packagePriceVnd: 1_500_000,
    addOnsTotalVnd: 0,
    platformFeeVnd: 180_000,
    totalVnd: 1_680_000,
    creatorEarningsVnd: 1_500_000,
  },
  snapshot: null,
  statusReason: null,
  expiresAt: null,
  timeline: [
    {
      at: '2026-08-10T09:00:00.000Z',
      actorUserId: 'usr_brand',
      action: 'create',
      fromStatus: null,
      toStatus: 'draft',
      note: null,
    },
  ],
  createdAt: '2026-08-10T09:00:00.000Z',
  updatedAt: '2026-08-10T09:00:00.000Z',
  ...overrides,
});

const setup = (role: AuthRole, booking: Booking): void => {
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    user: { id: 'usr_1', role, displayName: 'Người dùng' } as AuthUser,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  } as never);
  mockUseBooking.mockReturnValue({
    data: booking,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  mockUseActions.mockReturnValue({
    transition: transitionMutation,
    updateBrief: { mutateAsync: vi.fn(), isPending: false },
  } as never);

  render(
    <MemoryRouter initialEntries={['/bookings/bkg_1']}>
      <Routes>
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('BookingDetailPage (BKG-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị mã booking, trạng thái và breakdown tiền đầy đủ (PAY-005)', () => {
    setup('brand', makeBooking());

    expect(screen.getByRole('heading', { name: 'KB-260810-A7K2' })).toBeInTheDocument();
    expect(screen.getByText('Chờ creator phản hồi')).toBeInTheDocument();
    expect(screen.getByText(/1\.680\.000/)).toBeInTheDocument();
    expect(screen.getByText(/180\.000/)).toBeInTheDocument();
  });

  it('gợi ý việc tiếp theo khác nhau theo vai', () => {
    setup('creator', makeBooking());
    expect(screen.getByText(/Bạn cần phản hồi/)).toBeInTheDocument();
  });

  it('creator ở trạng thái chờ phản hồi thấy đúng 3 nút hành động', () => {
    setup('creator', makeBooking());

    expect(screen.getByRole('button', { name: 'Chấp nhận booking' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đề nghị thay đổi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Từ chối' })).toBeInTheDocument();
  });

  it('brand không thấy nút của creator (server vẫn chặn, UI không dụ bấm)', () => {
    setup('brand', makeBooking());

    expect(screen.queryByRole('button', { name: 'Chấp nhận booking' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy booking' })).toBeInTheDocument();
  });

  it('action không cần lý do gọi mutation ngay', async () => {
    setup('creator', makeBooking());

    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận booking' }));
    await waitFor(() => {
      expect(transitionMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'bkg_1',
        action: 'accept',
      });
    });
  });

  it('action cần lý do mở modal và chỉ gửi khi lý do đủ dài', async () => {
    setup('creator', makeBooking());

    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    const confirm = screen.getByRole('button', { name: 'Xác nhận' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Lý do/), {
      target: { value: 'Lịch tuần này đã kín.' },
    });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(transitionMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'bkg_1',
        action: 'reject',
        reason: 'Lịch tuần này đã kín.',
      });
    });
  });

  it('có snapshot thì hiện mục điều khoản đã khóa kèm mốc thời gian', () => {
    setup(
      'brand',
      makeBooking({
        status: 'confirmed' as BookingStatus,
        snapshot: {
          packageId: 'pkg_0001',
          packageVersion: 2,
          packageName: 'Video review quán',
          platforms: ['tiktok'],
          deliverables: [],
          usageRights: { repost: true, paidAds: false, durationMonths: 3, channels: [] },
          turnaroundDays: 5,
          revisionsIncluded: 1,
          selectedAddOns: [],
          totals: {
            packagePriceVnd: 1_500_000,
            addOnsTotalVnd: 0,
            platformFeeVnd: 180_000,
            totalVnd: 1_680_000,
            creatorEarningsVnd: 1_500_000,
          },
          brief: makeBooking().brief,
          lockedAt: '2026-08-10T10:00:00.000Z',
        },
      }),
    );

    expect(screen.getByText('Điều khoản đã khóa')).toBeInTheDocument();
    expect(screen.getByText(/Video review quán \(v2\)/)).toBeInTheDocument();
    expect(screen.getByText(/không ảnh hưởng booking/)).toBeInTheDocument();
  });
});
