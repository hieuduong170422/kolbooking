import { useState, type FormEvent } from 'react';
import { AuthError } from '../../auth/components/auth-error';
import {
  BRAND_ENTITY_TYPES,
  BRAND_ENTITY_TYPE_LABELS,
  type BrandEntityType,
  type BrandOwner,
  type BrandProfileInput,
} from '../types/brand-types';

interface BrandProfileFormProps {
  /** Hồ sơ hiện có — undefined khi tạo mới. */
  readonly initial?: BrandOwner;
  readonly onSubmit: (input: BrandProfileInput) => Promise<void>;
}

/** Form hồ sơ brand (BRD-001, BRD-002, BRD-005) — controlled, submit qua props. */
export const BrandProfileForm = ({ initial, onSubmit }: BrandProfileFormProps) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [industry, setIndustry] = useState(initial?.industry ?? '');
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [socialLinks, setSocialLinks] = useState(initial?.socialLinks.join(', ') ?? '');
  const [businessAddress, setBusinessAddress] = useState(initial?.businessAddress ?? '');
  const [entityType, setEntityType] = useState<BrandEntityType>(
    initial?.entityType ?? 'individual',
  );
  const [contactName, setContactName] = useState(initial?.contact.name ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contact.email ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contact.phone ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        name,
        logoUrl: initial?.logoUrl ?? null,
        industry,
        website: website.trim() === '' ? null : website.trim(),
        socialLinks: socialLinks
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
        businessAddress,
        entityType,
        contact: { name: contactName, email: contactEmail, phone: contactPhone },
      });
    } catch (submitError) {
      setError(submitError);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
      <AuthError error={error} />

      <div className="form-grid">
        <label className="form-field">
          <span>Tên brand</span>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
        </label>
        <label className="form-field">
          <span>Ngành hàng</span>
          <input
            type="text"
            className="input"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            placeholder="f&b, fashion, beauty..."
            minLength={2}
            maxLength={50}
            required
          />
        </label>
      </div>

      <fieldset className="radio-group">
        <legend>Loại chủ thể (dùng cho xác minh và chứng từ)</legend>
        {BRAND_ENTITY_TYPES.map((option) => (
          <label key={option} className="radio-option">
            <input
              type="radio"
              name="entityType"
              value={option}
              checked={entityType === option}
              onChange={() => setEntityType(option)}
            />
            <span>{BRAND_ENTITY_TYPE_LABELS[option]}</span>
          </label>
        ))}
      </fieldset>

      <label className="form-field">
        <span>Địa chỉ kinh doanh</span>
        <input
          type="text"
          className="input"
          value={businessAddress}
          onChange={(event) => setBusinessAddress(event.target.value)}
          minLength={5}
          maxLength={200}
          required
        />
      </label>

      <div className="form-grid">
        <label className="form-field">
          <span>Website (không bắt buộc)</span>
          <input
            type="url"
            className="input"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://..."
          />
        </label>
        <label className="form-field">
          <span>Link mạng xã hội (phân cách dấu phẩy)</span>
          <input
            type="text"
            className="input"
            value={socialLinks}
            onChange={(event) => setSocialLinks(event.target.value)}
            placeholder="https://facebook.com/..."
          />
        </label>
      </div>

      <fieldset className="form-section">
        <legend>Người liên hệ booking — không hiển thị công khai (BRD-005)</legend>
        <div className="form-grid form-grid--3">
          <label className="form-field">
            <span>Họ tên</span>
            <input
              type="text"
              className="input"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              minLength={2}
              maxLength={50}
              required
            />
          </label>
          <label className="form-field">
            <span>Email liên hệ</span>
            <input
              type="email"
              className="input"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Số điện thoại</span>
            <input
              type="tel"
              className="input"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              pattern="(0|\+84)[0-9]{8,10}"
              placeholder="0912345678"
              required
            />
          </label>
        </div>
      </fieldset>

      <button type="submit" className="button button--primary" disabled={pending}>
        {pending ? 'Đang lưu...' : initial ? 'Lưu hồ sơ' : 'Tạo hồ sơ brand'}
      </button>
    </form>
  );
};
