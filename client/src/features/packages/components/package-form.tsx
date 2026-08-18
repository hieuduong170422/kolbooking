import { useState, type FormEvent } from 'react';
import {
  Button,
  Checkbox,
  ChipGroup,
  IconButton,
  Input,
  Select,
  Textarea,
} from '../../../shared/components/ui';
import { IconPlus, IconTrash } from '../../../shared/components/icons';
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
        <Input
          label="Tên package"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={5}
          maxLength={100}
          required
        />
        <Input
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="f&b, lifestyle, tech..."
          minLength={2}
          maxLength={50}
          required
        />
      </div>

      <ChipGroup
        legend="Nền tảng"
        value={platforms}
        options={SOCIAL_PLATFORMS.map((platform) => ({ value: platform, label: platform }))}
        onChange={(next) => setPlatforms(next as readonly SocialPlatform[])}
      />

      <Textarea
        label="Mô tả"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={4}
        minLength={20}
        maxLength={2000}
        showCounter
        hint="Tối thiểu 20 ký tự — nói rõ brand nhận được gì."
        required
      />

      <div className="form-grid form-grid--3">
        <Input
          label="Giá (VND)"
          type="number"
          value={priceVnd}
          onChange={(event) => setPriceVnd(Number(event.target.value))}
          min={50_000}
          step={10_000}
          required
        />
        <Input
          label="Thời gian hoàn thành (ngày)"
          type="number"
          value={turnaroundDays}
          onChange={(event) => setTurnaroundDays(Number(event.target.value))}
          min={1}
          max={60}
          required
        />
        <Input
          label="Số lần sửa"
          type="number"
          value={revisionsIncluded}
          onChange={(event) => setRevisionsIncluded(Number(event.target.value))}
          min={0}
          max={10}
          required
        />
      </div>

      <fieldset className="form-section">
        <legend>Deliverables — brand nhận được gì (PKG-002)</legend>
        {deliverables.map((deliverable, index) => (
          <div key={index} className="deliverable-row">
            <Select
              aria-label={`Loại deliverable ${index + 1}`}
              options={DELIVERABLE_TYPES.map((type) => ({
                value: type,
                label: DELIVERABLE_TYPE_LABELS[type],
              }))}
              value={deliverable.type}
              onChange={(type) => patchDeliverable(index, { type: type as DeliverableType })}
            />
            <Input
              type="number"
              narrow
              aria-label={`Số lượng deliverable ${index + 1}`}
              value={deliverable.quantity}
              onChange={(event) => patchDeliverable(index, { quantity: Number(event.target.value) })}
              min={1}
              max={50}
              required
            />
            <Input
              aria-label={`Mô tả deliverable ${index + 1}`}
              placeholder="vd: Video 30-60s dọc 9:16"
              value={deliverable.description}
              onChange={(event) => patchDeliverable(index, { description: event.target.value })}
              minLength={3}
              maxLength={200}
              required
            />
            <Checkbox
              label="Đăng kênh creator"
              checked={deliverable.postedOnCreatorChannel}
              onChange={(event) =>
                patchDeliverable(index, { postedOnCreatorChannel: event.target.checked })
              }
            />
            {deliverables.length > 1 ? (
              <IconButton
                label={`Xóa deliverable ${index + 1}`}
                tone="danger"
                icon={<IconTrash />}
                onClick={() => setDeliverables((current) => current.filter((_, i) => i !== index))}
              />
            ) : null}
          </div>
        ))}
        <Button
          icon={<IconPlus />}
          onClick={() => setDeliverables((current) => [...current, { ...EMPTY_DELIVERABLE }])}
        >
          Thêm deliverable
        </Button>
      </fieldset>

      <fieldset className="form-section">
        <legend>Quyền sử dụng nội dung (PKG-004)</legend>
        <div className="form-grid">
          <Checkbox
            label="Brand được đăng lại (repost)"
            checked={repost}
            onChange={(event) => setRepost(event.target.checked)}
          />
          <Checkbox
            label="Brand được chạy quảng cáo"
            checked={paidAds}
            onChange={(event) => setPaidAds(event.target.checked)}
          />
        </div>
        <div className="form-grid">
          <Input
            label="Thời hạn sử dụng (tháng, trống = không giới hạn)"
            type="number"
            value={durationMonths ?? ''}
            onChange={(event) =>
              setDurationMonths(event.target.value === '' ? null : Number(event.target.value))
            }
            min={1}
            max={120}
          />
          <Input
            label="Kênh brand được dùng (phân cách dấu phẩy)"
            value={channels}
            onChange={(event) => setChannels(event.target.value)}
            placeholder="facebook, website"
          />
        </div>
        <Input
          label="Bài đăng duy trì công khai tối thiểu (ngày, trống = không cam kết)"
          type="number"
          value={postDurationDays ?? ''}
          onChange={(event) =>
            setPostDurationDays(event.target.value === '' ? null : Number(event.target.value))
          }
          min={1}
          max={365}
        />
      </fieldset>

      <fieldset className="form-section">
        <legend>Add-on (PKG-006)</legend>
        {addOns.map((addOn, index) => (
          <div key={index} className="deliverable-row">
            <Select
              aria-label={`Loại add-on ${index + 1}`}
              options={ADD_ON_TYPES.map((type) => ({
                value: type,
                label: ADD_ON_TYPE_LABELS[type],
              }))}
              value={addOn.type}
              onChange={(type) => patchAddOn(index, { type: type as AddOnType })}
            />
            <Input
              aria-label={`Tên add-on ${index + 1}`}
              placeholder="vd: Giao nhanh 48h"
              value={addOn.label}
              onChange={(event) => patchAddOn(index, { label: event.target.value })}
              minLength={2}
              maxLength={100}
              required
            />
            <Input
              type="number"
              narrow
              aria-label={`Giá add-on ${index + 1}`}
              value={addOn.priceVnd}
              onChange={(event) => patchAddOn(index, { priceVnd: Number(event.target.value) })}
              min={1}
              step={10_000}
              required
            />
            <IconButton
              label={`Xóa add-on ${index + 1}`}
              tone="danger"
              icon={<IconTrash />}
              onClick={() => setAddOns((current) => current.filter((_, i) => i !== index))}
            />
          </div>
        ))}
        <Button
          icon={<IconPlus />}
          onClick={() =>
            setAddOns((current) => [
              ...current,
              { type: 'fast_delivery', label: '', priceVnd: 100_000 },
            ])
          }
        >
          Thêm add-on
        </Button>
      </fieldset>

      <div className="form-actions">
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          disabled={platforms.length === 0}
        >
          {pending ? 'Đang lưu...' : initial ? 'Lưu thay đổi' : 'Tạo package'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
      </div>
    </form>
  );
};
