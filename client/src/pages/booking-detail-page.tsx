import { useState } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../features/auth/store/use-auth';
import { useBooking, useBookingActions } from '../features/bookings/hooks/use-bookings';
import { availableActions, nextActionHint } from '../features/bookings/next-action';
import {
  ACTIONS_REQUIRING_REASON,
  BOOKING_ACTION_LABELS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONE,
  type BookingAction,
} from '../features/bookings/types/booking-types';
import { BookingChat } from '../features/messages/components/booking-chat';
import { FulfillmentPanel } from '../features/submissions/components/fulfillment-panel';
import { Button, Modal, Textarea } from '../shared/components/ui';
import { ApiClientError } from '../shared/api/api-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { formatVnd } from '../shared/utils/format';
import { Breadcrumb } from '../shared/components/navigation/breadcrumb';

const formatDate = (iso: string): string => new Date(iso).toLocaleString('vi-VN');

/** Trang /bookings/:id — timeline, điều khoản đã khóa và việc cần làm tiếp (BKG-008). */
export const BookingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: booking, isPending, isError, refetch } = useBooking(id);
  const { transition } = useBookingActions();
  const [pendingAction, setPendingAction] = useState<BookingAction | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<unknown>(null);

  if (isPending) return <LoadingState message="Đang tải booking..." />;
  if (isError || booking === undefined) {
    return <ErrorState message="Không tìm thấy booking này." onRetry={() => void refetch()} />;
  }
  if (!user) return null;

  const actions = availableActions(booking, user.role);
  const terms = booking.snapshot;

  const run = (action: BookingAction, actionReason?: string): void => {
    setActionError(null);
    transition
      .mutateAsync({
        id: booking.id,
        action,
        ...(actionReason !== undefined ? { reason: actionReason } : {}),
      })
      .then(() => {
        setPendingAction(null);
        setReason('');
      })
      .catch((error: unknown) => setActionError(error));
  };

  const handleAction = (action: BookingAction): void => {
    if (ACTIONS_REQUIRING_REASON.includes(action)) {
      setPendingAction(action);
      setReason('');
      return;
    }
    run(action);
  };

  return (
    <section className="page">
      <Breadcrumb items={[{ label: 'Booking', to: '/bookings' }, { label: booking.code }]} />

      <div className="page__header page__header--row">
        <div>
          <h1>{booking.code}</h1>
          <p className="page__subtitle">
            Tạo ngày {formatDate(booking.createdAt)} · Brief v{booking.brief.version}
          </p>
        </div>
        <span className={`pill pill--${BOOKING_STATUS_TONE[booking.status]}`}>
          {BOOKING_STATUS_LABELS[booking.status]}
        </span>
      </div>

      {/* Thanh việc cần làm — nguyên tắc "trạng thái dẫn lối" */}
      <div className="next-action">
        <div>
          <p className="next-action__label">Việc tiếp theo</p>
          <p className="next-action__hint">{nextActionHint(booking, user.role)}</p>
          {booking.expiresAt !== null ? (
            <p className="next-action__deadline">Hạn: {formatDate(booking.expiresAt)}</p>
          ) : null}
        </div>
        {actions.length > 0 ? (
          <div className="next-action__buttons">
            {actions.map((action) => (
              <Button
                key={action}
                variant={action === 'reject' || action === 'cancel' ? 'danger' : 'primary'}
                disabled={transition.isPending}
                onClick={() => handleAction(action)}
              >
                {BOOKING_ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {actionError instanceof ApiClientError ? (
        <div className="notice notice--warning" role="alert">
          <p>{actionError.message}</p>
        </div>
      ) : null}

      {booking.statusReason !== null ? (
        <div className="notice notice--warning">
          <p>Lý do gần nhất: {booking.statusReason}</p>
        </div>
      ) : null}

      <div className="creator-detail">
        <div className="creator-detail__main">
          <section className="creator-detail__section">
            <h2>Brief</h2>
            <dl className="brief-list">
              <dt>Mục tiêu</dt>
              <dd>{booking.brief.objective}</dd>
              <dt>Key message</dt>
              <dd>{booking.brief.keyMessage}</dd>
              <dt>Deadline mong muốn</dt>
              <dd>{new Date(booking.brief.desiredDeadline).toLocaleDateString('vi-VN')}</dd>
              {booking.brief.mustHaveScenes.length > 0 ? (
                <>
                  <dt>Cảnh bắt buộc</dt>
                  <dd>
                    <ul>
                      {booking.brief.mustHaveScenes.map((scene) => (
                        <li key={scene}>{scene}</li>
                      ))}
                    </ul>
                  </dd>
                </>
              ) : null}
              {booking.brief.prohibited.length > 0 ? (
                <>
                  <dt>Điều cấm</dt>
                  <dd>
                    <ul>
                      {booking.brief.prohibited.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </>
              ) : null}
            </dl>
          </section>

          {terms !== null ? (
            <section className="creator-detail__section">
              <h2>Điều khoản đã khóa</h2>
              <p className="onb-hint">
                Chốt lúc {formatDate(terms.lockedAt)} — thay đổi gói dịch vụ sau thời điểm này
                không ảnh hưởng booking.
              </p>
              <ul className="booking-panel__facts">
                <li>
                  <span>Gói</span>
                  <strong>
                    {terms.packageName} (v{terms.packageVersion})
                  </strong>
                </li>
                <li>
                  <span>Thời gian hoàn thành</span>
                  <strong>{terms.turnaroundDays} ngày</strong>
                </li>
                <li>
                  <span>Số lần sửa</span>
                  <strong>{terms.revisionsIncluded}</strong>
                </li>
                <li>
                  <span>Quyền sử dụng</span>
                  <strong>
                    {terms.usageRights.repost ? 'Được đăng lại' : 'Không đăng lại'}
                    {terms.usageRights.paidAds ? ' · Được chạy quảng cáo' : ''}
                  </strong>
                </li>
              </ul>
            </section>
          ) : null}

          {terms !== null ? (
            <section className="creator-detail__section">
              <FulfillmentPanel booking={booking} role={user.role} />
            </section>
          ) : null}

          <section className="creator-detail__section">
            <BookingChat bookingId={booking.id} />
          </section>

          <section className="creator-detail__section">
            <h2>Dòng thời gian</h2>
            <ol className="timeline">
              {booking.timeline.map((event, index) => (
                <li key={index} className="timeline__item">
                  <span className="timeline__dot" aria-hidden="true" />
                  <div>
                    <p className="timeline__action">
                      {BOOKING_STATUS_LABELS[event.toStatus]}
                      <span className="timeline__time">{formatDate(event.at)}</span>
                    </p>
                    {event.note !== null ? <p className="timeline__note">{event.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="creator-detail__aside">
          <div className="booking-panel">
            <h2 className="booking-panel__heading">Chi tiết thanh toán</h2>
            <ul className="booking-panel__facts">
              <li>
                <span>Gói dịch vụ</span>
                <strong>{formatVnd(booking.totals.packagePriceVnd)}</strong>
              </li>
              <li>
                <span>Add-on</span>
                <strong>{formatVnd(booking.totals.addOnsTotalVnd)}</strong>
              </li>
              <li>
                <span>Phí nền tảng</span>
                <strong>{formatVnd(booking.totals.platformFeeVnd)}</strong>
              </li>
              <li>
                <span>
                  <strong>Tổng brand trả</strong>
                </span>
                <strong>{formatVnd(booking.totals.totalVnd)}</strong>
              </li>
              <li>
                <span>Creator nhận</span>
                <strong>{formatVnd(booking.totals.creatorEarningsVnd)}</strong>
              </li>
            </ul>
            <p className="booking-panel__note">
              Tiền chỉ giải ngân cho creator sau khi brand nghiệm thu nội dung.
            </p>
          </div>
        </aside>
      </div>

      {pendingAction !== null ? (
        <Modal
          title={BOOKING_ACTION_LABELS[pendingAction]}
          onClose={() => setPendingAction(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setPendingAction(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={transition.isPending}
                disabled={reason.trim().length < 5}
                onClick={() => run(pendingAction, reason.trim())}
              >
                Xác nhận
              </Button>
            </>
          }
        >
          <Textarea
            label="Lý do (bắt buộc)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            minLength={5}
            placeholder="Nêu rõ để phía kia hiểu và xử lý nhanh."
          />
        </Modal>
      ) : null}
    </section>
  );
};
