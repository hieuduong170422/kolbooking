import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { LinkList } from '../features/bookings/components/link-list';
import { TagPicker } from '../features/bookings/components/tag-picker';
import {
  CAMPAIGN_OBJECTIVES,
  PROHIBITED_PRESETS,
  findObjective,
  scenePresetsFor,
} from '../features/bookings/data/brief-presets';
import { earliestDeadlineDay, effectiveTurnaroundDays } from '../features/bookings/deadline';
import { estimateTotals } from '../features/bookings/pricing';
import { useCreateBooking } from '../features/bookings/hooks/use-bookings';
import { useAppConfig } from '../features/config/hooks/use-app-config';
import { usePackagesByCreator } from '../features/packages/hooks/use-public-packages';
import { ApiClientError } from '../shared/api/api-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { Button, Input, LinkButton, Textarea } from '../shared/components/ui';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { formatVnd } from '../shared/utils/format';
import { Breadcrumb } from '../shared/components/navigation/breadcrumb';

/** YYYY-MM-DD → dd/mm/yyyy. Tự tách chuỗi thay vì qua Date để không lệch múi giờ. */
const formatDay = (isoDay: string): string => isoDay.split('-').reverse().join('/');

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
  const config = useAppConfig();
  const createBooking = useCreateBooking();

  const [selectedAddOnIds, setSelectedAddOnIds] = useState<readonly string[]>([]);
  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const [objective, setObjective] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [mustHaveScenes, setMustHaveScenes] = useState<readonly string[]>([]);
  const [prohibited, setProhibited] = useState<readonly string[]>([]);
  const [references, setReferences] = useState<readonly string[]>([]);
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
        <LinkButton to="/creators">Tìm creator khác</LinkButton>
      </section>
    );
  }

  const selectedAddOns = pkg.addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id));
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.priceVnd, 0);
  const totals = estimateTotals(pkg.priceVnd + addOnsTotal, config);

  const selectedObjective = objectiveId === null ? undefined : findObjective(objectiveId);
  const turnaroundDays = effectiveTurnaroundDays(
    pkg.turnaroundDays,
    selectedAddOns,
    config.fastDeliveryTurnaroundDays,
  );
  const minDeadline = earliestDeadlineDay(turnaroundDays);
  const isRushed = turnaroundDays < pkg.turnaroundDays;

  /**
   * Chọn mục tiêu = nạp bản nháp brief. Chỉ điền vào ô mục tiêu khi nó còn
   * trống hoặc đang giữ nguyên bản nháp của mục tiêu trước — người dùng đã tự
   * viết thì không được ghi đè công sức của họ.
   */
  const applyObjective = (nextId: string): void => {
    const next = findObjective(nextId);
    if (next === undefined) {
      return;
    }
    setObjectiveId(nextId);

    const untouched = objective.trim().length === 0 || objective === selectedObjective?.objectiveDraft;
    if (untouched) {
      setObjective(next.objectiveDraft);
    }
    // Gợi ý chỉ THÊM vào lựa chọn sẵn có, không xoá thứ người dùng đã chọn.
    setMustHaveScenes((current) => [...new Set([...current, ...next.suggestedScenes])]);
    setProhibited((current) => [...new Set([...current, ...next.suggestedProhibited])]);
  };

  const toggleAddOn = (addOnId: string): void => {
    setSelectedAddOnIds((current) =>
      current.includes(addOnId)
        ? current.filter((id) => id !== addOnId)
        : [...current, addOnId],
    );
  };

  /**
   * Bỏ tick add-on giao nhanh sau khi đã chọn ngày làm mốc sớm nhất lùi ra
   * xa hơn ngày đang chọn. Không tự sửa lựa chọn của brand — báo lỗi ngay tại
   * ô đó, vì server cũng sẽ từ chối đúng lý do này.
   */
  const deadlineTooEarly = desiredDeadline !== '' && desiredDeadline < minDeadline;

  const canSubmit =
    objective.trim().length >= 10 &&
    keyMessage.trim().length >= 5 &&
    desiredDeadline !== '' &&
    !deadlineTooEarly &&
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
          mustHaveScenes,
          prohibited,
          references,
          // input type=date cho YYYY-MM-DD; server cần ISO datetime đầy đủ.
          desiredDeadline: new Date(`${desiredDeadline}T00:00:00.000Z`).toISOString(),
        },
      },
      { onSuccess: (booking) => navigate(`/bookings/${booking.id}`) },
    );
  };

  return (
    <section className="page">
      <Breadcrumb
        items={[
          { label: 'Khám phá creator', to: '/creators' },
          { label: pkg.name, to: `/creators/${creatorId}` },
          { label: 'Gửi yêu cầu booking' },
        ]}
      />

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
              <fieldset className="chip-group field--full">
                <legend className="form-field__label">Mục tiêu chiến dịch</legend>
                <p className="onb-hint">
                  Chọn một mục tiêu để điền sẵn bản nháp brief — bạn sửa lại cho khớp sản phẩm
                  của mình.
                </p>
                <div className="chip-group__options">
                  {CAMPAIGN_OBJECTIVES.map((item) => (
                    <label key={item.id} className="chip-toggle">
                      <input
                        type="radio"
                        name="campaign-objective"
                        checked={objectiveId === item.id}
                        onChange={() => applyObjective(item.id)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Textarea
                label="Mô tả mục tiêu"
                span="full"
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                rows={3}
                minLength={10}
                placeholder="Bạn muốn đạt được gì với nội dung này?"
                required
              />
              <Input
                label="Key message"
                span="full"
                value={keyMessage}
                onChange={(event) => setKeyMessage(event.target.value)}
                minLength={5}
                placeholder={
                  selectedObjective?.keyMessageHint ?? 'Thông điệp bắt buộc phải xuất hiện'
                }
                required
              />
              <TagPicker
                label="Cảnh bắt buộc"
                description="Những gì nhất định phải xuất hiện trong bài. Chọn từ gợi ý hoặc tự thêm."
                presets={scenePresetsFor(pkg.category)}
                selected={mustHaveScenes}
                onChange={setMustHaveScenes}
                addPlaceholder="Cảnh khác bạn muốn có..."
              />
              <TagPicker
                label="Điều cấm"
                description="Giới hạn creator phải tuân thủ. Nêu trước đỡ phải sửa bài về sau."
                presets={PROHIBITED_PRESETS}
                selected={prohibited}
                onChange={setProhibited}
                addPlaceholder="Điều cấm khác..."
              />
              <LinkList links={references} onChange={setReferences} />
              {/* Nhãn gọn, câu giải thích dài đi qua `hint` — Field nối nó bằng
                  aria-describedby nên trình đọc màn hình không đọc cả câu làm nhãn. */}
              <Input
                label="Deadline mong muốn"
                span="half"
                type="date"
                value={desiredDeadline}
                min={minDeadline}
                onChange={(event) => setDesiredDeadline(event.target.value)}
                hint={
                  isRushed
                    ? `Có add-on giao nhanh nên chỉ cần ${turnaroundDays} ngày sản xuất — sớm nhất là ${formatDay(minDeadline)}.`
                    : `Gói này cần ${turnaroundDays} ngày sản xuất, nên sớm nhất là ${formatDay(minDeadline)}.`
                }
                error={deadlineTooEarly ? `Chọn từ ngày ${formatDay(minDeadline)} trở đi.` : undefined}
                required
              />
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
                <strong>{formatVnd(totals.subtotalVnd)}</strong>
              </li>
              <li>
                <span>Phí nền tảng ({config.platformFeePercent}%)</span>
                <strong>{formatVnd(totals.platformFeeVnd)}</strong>
              </li>
              <li className="booking-panel__total">
                <span>Bạn trả</span>
                <strong>{formatVnd(totals.totalVnd)}</strong>
              </li>
            </ul>
            <p className="booking-panel__note">
              Đã gồm phí nền tảng — không có khoản nào cộng thêm sau. Server tính lại con số
              này khi tạo booking.
            </p>
            <Button
              type="submit"
              variant="primary"
              className="booking-panel__cta"
              disabled={!canSubmit}
            >
              {createBooking.isPending ? 'Đang tạo...' : 'Tạo yêu cầu booking'}
            </Button>
            <p className="booking-panel__note">
              Yêu cầu được lưu ở dạng nháp — bạn xem lại rồi mới gửi cho creator.
            </p>
          </div>
        </aside>
      </form>
    </section>
  );
};
