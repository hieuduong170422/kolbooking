import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useCreateBooking } from '../features/bookings/hooks/use-bookings';
import { usePackagesByCreator } from '../features/packages/hooks/use-public-packages';
import { ApiClientError } from '../shared/api/api-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { formatVnd } from '../shared/utils/format';

/** Nhập danh sách nhiều dòng — tách theo xuống dòng, bỏ dòng trống. */
const toLines = (value: string): readonly string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/**
 * Trang /creators/:id/book — brand chọn add-on, nhập brief và gửi yêu cầu
 * (BKG-001, BKG-002). Tổng tiền hiển thị là ước tính; server tính lại và
 * là số cuối cùng (PAY-001).
 */
export const BookingCreatePage = () => {
  const { id: creatorId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get('package');
  const navigate = useNavigate();

  const { data, isPending, isError } = usePackagesByCreator(creatorId);
  const createBooking = useCreateBooking();

  const [selectedAddOnIds, setSelectedAddOnIds] = useState<readonly string[]>([]);
  const [objective, setObjective] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [mustHaveScenes, setMustHaveScenes] = useState('');
  const [prohibited, setProhibited] = useState('');
  const [references, setReferences] = useState('');
  const [desiredDeadline, setDesiredDeadline] = useState('');

  if (isPending) return <LoadingState message="Đang tải gói dịch vụ..." />;
  if (isError || data === undefined) {
    return <ErrorState message="Không tải được gói dịch vụ của creator." />;
  }

  const pkg = data.data.find((item) => item.id === packageId) ?? data.data[0];
  if (pkg === undefined || creatorId === undefined) {
    return (
      <section className="page page--center">
        <h1>Creator chưa có gói dịch vụ</h1>
        <p className="page__subtitle">Chưa thể đặt booking với creator này.</p>
        <Link to="/creators" className="button button--primary">
          Tìm creator khác
        </Link>
      </section>
    );
  }

  const selectedAddOns = pkg.addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id));
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.priceVnd, 0);
  const subtotal = pkg.priceVnd + addOnsTotal;

  const toggleAddOn = (addOnId: string): void => {
    setSelectedAddOnIds((current) =>
      current.includes(addOnId)
        ? current.filter((id) => id !== addOnId)
        : [...current, addOnId],
    );
  };

  const canSubmit =
    objective.trim().length >= 10 &&
    keyMessage.trim().length >= 5 &&
    desiredDeadline !== '' &&
    !createBooking.isPending;

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    createBooking.mutate(
      {
        creatorId,
        packageId: pkg.id,
        selectedAddOnIds,
        brief: {
          objective: objective.trim(),
          keyMessage: keyMessage.trim(),
          mustHaveScenes: toLines(mustHaveScenes),
          prohibited: toLines(prohibited),
          references: toLines(references),
          // input type=date cho YYYY-MM-DD; server cần ISO datetime đầy đủ.
          desiredDeadline: new Date(`${desiredDeadline}T00:00:00.000Z`).toISOString(),
        },
      },
      { onSuccess: (booking) => navigate(`/bookings/${booking.id}`) },
    );
  };

  return (
    <section className="page">
      <Link to={`/creators/${creatorId}`} className="back-link">
        ← Quay lại hồ sơ creator
      </Link>

      <div className="page__header">
        <h1>Gửi yêu cầu booking</h1>
        <p className="page__subtitle">
          Brief càng rõ, creator càng ít hỏi lại và ít phải sửa bài.
        </p>
      </div>

      <form className="booking-create" onSubmit={handleSubmit}>
        <div className="booking-create__main">
          {createBooking.error instanceof ApiClientError ? (
            <div className="notice notice--warning" role="alert">
              <p>{createBooking.error.message}</p>
            </div>
          ) : null}

          <section className="onb-section">
            <h2 className="onb-section__title">Gói dịch vụ</h2>
            <p className="onb-section__desc">{pkg.name}</p>
            <ul className="pkg-card__deliverables">
              {pkg.deliverables.map((deliverable, index) => (
                <li key={index}>
                  {deliverable.quantity}× {deliverable.description}
                </li>
              ))}
            </ul>
          </section>

          {pkg.addOns.length > 0 ? (
            <section className="onb-section">
              <h2 className="onb-section__title">Add-on (tùy chọn)</h2>
              <div className="filter-group__stack">
                {pkg.addOns.map((addOn) => (
                  <label key={addOn.id} className="onb-pause">
                    <input
                      type="checkbox"
                      checked={selectedAddOnIds.includes(addOn.id)}
                      onChange={() => toggleAddOn(addOn.id)}
                    />
                    <span>
                      <strong>{addOn.label}</strong>
                      <em>+{formatVnd(addOn.priceVnd)}</em>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <section className="onb-section">
            <h2 className="onb-section__title">Brief</h2>
            <div className="field-grid">
              <label className="form-field field--full">
                <span>Mục tiêu chiến dịch</span>
                <textarea
                  className="textarea"
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                  rows={3}
                  minLength={10}
                  placeholder="Bạn muốn đạt được gì với nội dung này?"
                  required
                />
              </label>
              <label className="form-field field--full">
                <span>Key message</span>
                <input
                  type="text"
                  className="input"
                  value={keyMessage}
                  onChange={(event) => setKeyMessage(event.target.value)}
                  minLength={5}
                  placeholder="Thông điệp bắt buộc phải xuất hiện"
                  required
                />
              </label>
              <label className="form-field field--half">
                <span>Cảnh bắt buộc (mỗi dòng một ý)</span>
                <textarea
                  className="textarea"
                  value={mustHaveScenes}
                  onChange={(event) => setMustHaveScenes(event.target.value)}
                  rows={3}
                  placeholder={'Cảnh quay không gian quán\nCận cảnh sản phẩm'}
                />
              </label>
              <label className="form-field field--half">
                <span>Điều cấm (mỗi dòng một ý)</span>
                <textarea
                  className="textarea"
                  value={prohibited}
                  onChange={(event) => setProhibited(event.target.value)}
                  rows={3}
                  placeholder={'Không nhắc tên đối thủ'}
                />
              </label>
              <label className="form-field field--half">
                <span>Link tham khảo (mỗi dòng một link)</span>
                <textarea
                  className="textarea"
                  value={references}
                  onChange={(event) => setReferences(event.target.value)}
                  rows={2}
                />
              </label>
              <label className="form-field field--half">
                <span>Deadline mong muốn</span>
                <input
                  type="date"
                  className="input"
                  value={desiredDeadline}
                  onChange={(event) => setDesiredDeadline(event.target.value)}
                  required
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="booking-create__aside">
          <div className="booking-panel">
            <h2 className="booking-panel__heading">Tạm tính</h2>
            <ul className="booking-panel__facts">
              <li>
                <span>Gói dịch vụ</span>
                <strong>{formatVnd(pkg.priceVnd)}</strong>
              </li>
              {selectedAddOns.map((addOn) => (
                <li key={addOn.id}>
                  <span>{addOn.label}</span>
                  <strong>{formatVnd(addOn.priceVnd)}</strong>
                </li>
              ))}
              <li>
                <span>Tạm tính</span>
                <strong>{formatVnd(subtotal)}</strong>
              </li>
            </ul>
            <p className="booking-panel__note">
              Phí nền tảng được cộng khi server chốt đơn và hiển thị đầy đủ ở màn booking.
            </p>
            <button
              type="submit"
              className="button button--primary booking-panel__cta"
              disabled={!canSubmit}
            >
              {createBooking.isPending ? 'Đang tạo...' : 'Tạo yêu cầu booking'}
            </button>
            <p className="booking-panel__note">
              Yêu cầu được lưu ở dạng nháp — bạn xem lại rồi mới gửi cho creator.
            </p>
          </div>
        </aside>
      </form>
    </section>
  );
};
