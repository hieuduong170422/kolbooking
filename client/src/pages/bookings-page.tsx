import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../features/auth/store/use-auth';
import { useBookings } from '../features/bookings/hooks/use-bookings';
import { nextActionHint } from '../features/bookings/next-action';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONE,
  type BookingStatus,
} from '../features/bookings/types/booking-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { Pagination } from '../shared/components/pagination/pagination';
import { formatVnd } from '../shared/utils/format';

const PAGE_LIMIT = 20;

/** Trang /bookings — danh sách booking theo vai (BKG-008). */
export const BookingsPage = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useBookings({
    ...(status !== '' ? { status } : {}),
    page,
    limit: PAGE_LIMIT,
  });

  if (!user) return null;

  return (
    <section className="page">
      <div className="page__header">
        <h1>Booking của tôi</h1>
        <p className="page__subtitle">
          {user.role === 'creator'
            ? 'Yêu cầu brand gửi tới bạn và tiến độ từng booking.'
            : 'Yêu cầu bạn đã gửi và trạng thái hiện tại.'}
        </p>
      </div>

      <div className="review-tabs" role="tablist" aria-label="Lọc theo trạng thái">
        <button
          type="button"
          className={`review-tabs__tab${status === '' ? ' review-tabs__tab--active' : ''}`}
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
        >
          Tất cả
        </button>
        {BOOKING_STATUSES.slice(0, 6).map((item) => (
          <button
            key={item}
            type="button"
            className={`review-tabs__tab${item === status ? ' review-tabs__tab--active' : ''}`}
            onClick={() => {
              setStatus(item);
              setPage(1);
            }}
          >
            {BOOKING_STATUS_LABELS[item]}
          </button>
        ))}
      </div>

      {isPending ? <LoadingState message="Đang tải booking..." /> : null}
      {isError ? (
        <ErrorState message="Không tải được danh sách booking." onRetry={() => void refetch()} />
      ) : null}

      {data !== undefined ? (
        data.data.length === 0 ? (
          <div className="feedback">
            <p className="feedback__title">Chưa có booking nào</p>
            <p>
              {user.role === 'creator'
                ? 'Publish gói dịch vụ để brand tìm thấy và gửi yêu cầu.'
                : 'Tìm creator phù hợp và gửi yêu cầu booking đầu tiên.'}
            </p>
            <Link
              to={user.role === 'creator' ? '/my-packages' : '/creators'}
              className="button button--primary"
            >
              {user.role === 'creator' ? 'Quản lý package' : 'Khám phá creator'}
            </Link>
          </div>
        ) : (
          <>
            <ul className="booking-list">
              {data.data.map((booking) => (
                <li key={booking.id}>
                  <Link to={`/bookings/${booking.id}`} className="booking-row">
                    <div className="booking-row__body">
                      <div className="booking-row__heading">
                        <span className="booking-row__code">{booking.code}</span>
                        <span className={`pill pill--${BOOKING_STATUS_TONE[booking.status]}`}>
                          {BOOKING_STATUS_LABELS[booking.status]}
                        </span>
                      </div>
                      <p className="booking-row__objective">{booking.brief.objective}</p>
                      <p className="booking-row__hint">{nextActionHint(booking, user.role)}</p>
                    </div>
                    <div className="booking-row__side">
                      <span className="booking-row__amount">
                        {formatVnd(
                          user.role === 'creator'
                            ? booking.totals.creatorEarningsVnd
                            : booking.totals.totalVnd,
                        )}
                      </span>
                      <span className="booking-row__meta">
                        {user.role === 'creator' ? 'bạn nhận' : 'tổng thanh toán'}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {data.meta !== undefined && data.meta.totalPages > 1 ? (
              <Pagination meta={data.meta} onPageChange={setPage} />
            ) : null}
          </>
        )
      ) : null}
    </section>
  );
};
