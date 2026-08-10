import { useState, type FormEvent } from 'react';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../../creators/types/creator-types';
import { AuthError } from '../../auth/components/auth-error';
import {
  ADD_ON_TYPES,
  ADD_ON_TYPE_LABELS,
  DELIVERABLE_TYPES,
  DELIVERABLE_TYPE_LABELS,
  type AddOnType,
  type DeliverableType,
  type PackageInput,
  type PackageOwner,
} from '../types/package-types';

interface PackageFormProps {
  /** Package đang sửa — undefined khi tạo mới. */
  readonly initial?: PackageOwner;
  readonly onSubmit: (input: PackageInput) => Promise<void>;
  readonly onCancel: () => void;
}

interface DeliverableDraft {
  type: DeliverableType;
  quantity: number;
  description: string;
  postedOnCreatorChannel: boolean;
}

interface AddOnDraft {
  type: AddOnType;
  label: string;
  priceVnd: number;
}

const EMPTY_DELIVERABLE: DeliverableDraft = {
  type: 'video',
  quantity: 1,
  description: '',
  postedOnCreatorChannel: true,
};

/** Form tạo/sửa service package (PKG-001..PKG-006) — controlled, submit qua props. */
export const PackageForm = ({ initial, onSubmit, onCancel }: PackageFormProps) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [platforms, setPlatforms] = useState<readonly SocialPlatform[]>(initial?.platforms ?? []);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priceVnd, setPriceVnd] = useState(initial?.priceVnd ?? 500_000);
  const [turnaroundDays, setTurnaroundDays] = useState(initial?.turnaroundDays ?? 7);
  const [revisionsIncluded, setRevisionsIncluded] = useState(initial?.revisionsIncluded ?? 1);
  const [deliverables, setDeliverables] = useState<readonly DeliverableDraft[]>(
    initial?.deliverables.map((item) => ({ ...item })) ?? [{ ...EMPTY_DELIVERABLE }],
  );
  const [repost, setRepost] = useState(initial?.usageRights.repost ?? true);
  const [paidAds, setPaidAds] = useState(initial?.usageRights.paidAds ?? false);
  const [durationMonths, setDurationMonths] = useState<number | null>(
    initial?.usageRights.durationMonths ?? 3,
  );
  const [channels, setChannels] = useState(initial?.usageRights.channels.join(', ') ?? '');
  const [postDurationDays, setPostDurationDays] = useState<number | null>(
    initial?.postDurationDays ?? null,
  );
  const [addOns, setAddOns] = useState<readonly AddOnDraft[]>(
    initial?.addOns.map(({ type, label, priceVnd: price }) => ({ type, label, priceVnd: price })) ??
      [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const togglePlatform = (platform: SocialPlatform): void => {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  };

  const patchDeliverable = (index: number, patch: Partial<DeliverableDraft>): void => {
    setDeliverables((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const patchAddOn = (index: number, patch: Partial<AddOnDraft>): void => {
    setAddOns((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        name,
        category,
        platforms,
        description,
        coverImageUrl: initial?.coverImageUrl ?? null,
        deliverables,
        priceVnd,
        turnaroundDays,
        revisionsIncluded,
        usageRights: {
          repost,
          paidAds,
          durationMonths,
          channels: channels
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        },
        postDurationDays,
        addOns,
      });
    } catch (submitError) {
      setError(submitError);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="package-form" onSubmit={(event) => void handleSubmit(event)}>
      <AuthError error={error} />

      <div className="form-grid">
        <label className="form-field">
          <span>Tên package</span>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={5}
            maxLength={100}
            required
          />
        </label>
        <label className="form-field">
          <span>Category</span>
          <input
            type="text"
            className="input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="f&b, lifestyle, tech..."
            minLength={2}
            maxLength={50}
            required
          />
        </label>
      </div>

      <fieldset className="checkbox-group">
        <legend>Nền tảng</legend>
        {SOCIAL_PLATFORMS.map((platform) => (
          <label key={platform} className="checkbox-option">
            <input
              type="checkbox"
              checked={platforms.includes(platform)}
              onChange={() => togglePlatform(platform)}
            />
            <span>{platform}</span>
          </label>
        ))}
      </fieldset>

      <label className="form-field">
        <span>Mô tả</span>
        <textarea
          className="input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          minLength={20}
          maxLength={2000}
          required
        />
        <small>Tối thiểu 20 ký tự — nói rõ brand nhận được gì.</small>
      </label>

      <div className="form-grid form-grid--3">
        <label className="form-field">
          <span>Giá (VND)</span>
          <input
            type="number"
            className="input"
            value={priceVnd}
            onChange={(event) => setPriceVnd(Number(event.target.value))}
            min={50_000}
            step={10_000}
            required
          />
        </label>
        <label className="form-field">
          <span>Thời gian hoàn thành (ngày)</span>
          <input
            type="number"
            className="input"
            value={turnaroundDays}
            onChange={(event) => setTurnaroundDays(Number(event.target.value))}
            min={1}
            max={60}
            required
          />
        </label>
        <label className="form-field">
          <span>Số lần sửa</span>
          <input
            type="number"
            className="input"
            value={revisionsIncluded}
            onChange={(event) => setRevisionsIncluded(Number(event.target.value))}
            min={0}
            max={10}
            required
          />
        </label>
      </div>

      <fieldset className="form-section">
        <legend>Deliverables — brand nhận được gì (PKG-002)</legend>
        {deliverables.map((deliverable, index) => (
          <div key={index} className="deliverable-row">
            <select
              className="input"
              aria-label={`Loại deliverable ${index + 1}`}
              value={deliverable.type}
              onChange={(event) =>
                patchDeliverable(index, { type: event.target.value as DeliverableType })
              }
            >
              {DELIVERABLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DELIVERABLE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="input input--narrow"
              aria-label={`Số lượng deliverable ${index + 1}`}
              value={deliverable.quantity}
              onChange={(event) => patchDeliverable(index, { quantity: Number(event.target.value) })}
              min={1}
              max={50}
              required
            />
            <input
              type="text"
              className="input"
              aria-label={`Mô tả deliverable ${index + 1}`}
              placeholder="vd: Video 30-60s dọc 9:16"
              value={deliverable.description}
              onChange={(event) => patchDeliverable(index, { description: event.target.value })}
              minLength={3}
              maxLength={200}
              required
            />
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={deliverable.postedOnCreatorChannel}
                onChange={(event) =>
                  patchDeliverable(index, { postedOnCreatorChannel: event.target.checked })
                }
              />
              <span>Đăng kênh creator</span>
            </label>
            {deliverables.length > 1 ? (
              <button
                type="button"
                className="button button--ghost"
                aria-label={`Xóa deliverable ${index + 1}`}
                onClick={() =>
                  setDeliverables((current) => current.filter((_, i) => i !== index))
                }
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className="button button--secondary"
          onClick={() => setDeliverables((current) => [...current, { ...EMPTY_DELIVERABLE }])}
        >
          + Thêm deliverable
        </button>
      </fieldset>

      <fieldset className="form-section">
        <legend>Quyền sử dụng nội dung (PKG-004)</legend>
        <div className="form-grid">
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={repost}
              onChange={(event) => setRepost(event.target.checked)}
            />
            <span>Brand được đăng lại (repost)</span>
          </label>
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={paidAds}
              onChange={(event) => setPaidAds(event.target.checked)}
            />
            <span>Brand được chạy quảng cáo</span>
          </label>
        </div>
        <div className="form-grid">
          <label className="form-field">
            <span>Thời hạn sử dụng (tháng, trống = không giới hạn)</span>
            <input
              type="number"
              className="input"
              value={durationMonths ?? ''}
              onChange={(event) =>
                setDurationMonths(event.target.value === '' ? null : Number(event.target.value))
              }
              min={1}
              max={120}
            />
          </label>
          <label className="form-field">
            <span>Kênh brand được dùng (phân cách dấu phẩy)</span>
            <input
              type="text"
              className="input"
              value={channels}
              onChange={(event) => setChannels(event.target.value)}
              placeholder="facebook, website"
            />
          </label>
        </div>
        <label className="form-field">
          <span>Bài đăng duy trì công khai tối thiểu (ngày, trống = không cam kết)</span>
          <input
            type="number"
            className="input"
            value={postDurationDays ?? ''}
            onChange={(event) =>
              setPostDurationDays(event.target.value === '' ? null : Number(event.target.value))
            }
            min={1}
            max={365}
          />
        </label>
      </fieldset>

      <fieldset className="form-section">
        <legend>Add-on (PKG-006)</legend>
        {addOns.map((addOn, index) => (
          <div key={index} className="deliverable-row">
            <select
              className="input"
              aria-label={`Loại add-on ${index + 1}`}
              value={addOn.type}
              onChange={(event) => patchAddOn(index, { type: event.target.value as AddOnType })}
            >
              {ADD_ON_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ADD_ON_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="input"
              aria-label={`Tên add-on ${index + 1}`}
              placeholder="vd: Giao nhanh 48h"
              value={addOn.label}
              onChange={(event) => patchAddOn(index, { label: event.target.value })}
              minLength={2}
              maxLength={100}
              required
            />
            <input
              type="number"
              className="input input--narrow"
              aria-label={`Giá add-on ${index + 1}`}
              value={addOn.priceVnd}
              onChange={(event) => patchAddOn(index, { priceVnd: Number(event.target.value) })}
              min={1}
              step={10_000}
              required
            />
            <button
              type="button"
              className="button button--ghost"
              aria-label={`Xóa add-on ${index + 1}`}
              onClick={() => setAddOns((current) => current.filter((_, i) => i !== index))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button--secondary"
          onClick={() =>
            setAddOns((current) => [
              ...current,
              { type: 'fast_delivery', label: '', priceVnd: 100_000 },
            ])
          }
        >
          + Thêm add-on
        </button>
      </fieldset>

      <div className="form-actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={pending || platforms.length === 0}
        >
          {pending ? 'Đang lưu...' : initial ? 'Lưu thay đổi' : 'Tạo package'}
        </button>
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={pending}>
          Hủy
        </button>
      </div>
    </form>
  );
};
