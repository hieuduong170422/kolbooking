import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { ApiClientError } from '../../../shared/api/api-types';
import {
  usePortfolioActions,
  useSubmitProfileForReview,
  useUpdateAvailability,
  useUpdateCreatorProfile,
  useUploadAvatar,
} from '../hooks/use-creator-profile';
import {
  CREATOR_DAYS_OF_WEEK,
  CREATOR_DAY_OF_WEEK_LABELS,
  CREATOR_LANGUAGES,
  CREATOR_TYPE_LABELS,
  CREATOR_TYPES,
  SERVICE_MODES,
  SERVICE_MODE_LABELS,
  SOCIAL_PLATFORMS,
  type CreatorDayOfWeek,
  type CreatorLanguage,
  type CreatorOwner,
  type CreatorProfileInput,
  type CreatorType,
  type ServiceMode,
  type SocialPlatform,
} from '../types/creator-types';

const MAX_SOCIAL_ACCOUNTS = 4;

interface SocialDraft {
  readonly platform: SocialPlatform;
  readonly handle: string;
  readonly url: string;
  readonly followerCount: number;
}

interface CreatorProfileFormProps {
  /** Hồ sơ hiện có → prefill; null → chế độ tạo mới (CRE-001). */
  readonly profile: CreatorOwner | null;
  /** true khi hồ sơ bị khóa (pending_review/suspended) — server chặn với 409 (CRE-001..006). */
  readonly readOnly: boolean;
}

const FormError = ({ error }: { error: unknown }) => {
  if (!error) return null;
  const message =
    error instanceof ApiClientError ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
  const details = error instanceof ApiClientError ? error.details : [];
  return (
    <div className="form-error" role="alert">
      <p>{message}</p>
      {details.length > 0 ? (
        <ul>
          {details.map((detail) => (
            <li key={`${detail.field}-${detail.message}`}>{detail.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export const CreatorProfileForm = ({ profile, readOnly }: CreatorProfileFormProps) => {
  const updateProfile = useUpdateCreatorProfile();
  const submitReview = useSubmitProfileForReview();
  const updateAvailability = useUpdateAvailability();
  const uploadAvatar = useUploadAvatar();
  const { upload, addLink, remove } = usePortfolioActions();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl ?? null);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [niches, setNiches] = useState<string[]>(() => (profile ? [...profile.niches] : []));
  const [nicheInput, setNicheInput] = useState('');
  const [language, setLanguage] = useState<CreatorLanguage>(profile?.language ?? 'vi');
  const [creatorType, setCreatorType] = useState<CreatorType>(profile?.creatorType ?? 'influencer');
  const [serviceMode, setServiceMode] = useState<ServiceMode>(profile?.serviceMode ?? 'both');
  const [socialAccounts, setSocialAccounts] = useState<SocialDraft[]>(() =>
    profile
      ? profile.socialAccounts.map(({ platform, handle, url, followerCount }) => ({
          platform,
          handle,
          url,
          followerCount,
        }))
      : [],
  );
  const [followerCount, setFollowerCount] = useState(profile?.audienceMetrics?.followerCount ?? 0);
  const [viewCount, setViewCount] = useState(profile?.audienceMetrics?.viewCount ?? 0);
  const [availableDays, setAvailableDays] = useState<CreatorDayOfWeek[]>(() =>
    profile ? [...profile.availability.availableDays] : [],
  );
  const [isPaused, setIsPaused] = useState(profile?.availability.isPaused ?? false);
  const [linkInput, setLinkInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const portfolioItems = profile?.portfolioItems ?? [];

  const isIncomplete =
    displayName.trim() === '' || bio.trim() === '' || city.trim() === '' || niches.length === 0;

  const buildProfileInput = (): CreatorProfileInput => ({
    displayName: displayName.trim(),
    avatarUrl: avatarUrl ?? null,
    bio: bio.trim(),
    city: city.trim(),
    niches,
    language,
    creatorType,
    socialAccounts: socialAccounts.map(({ platform, handle, url, followerCount }) => ({
      platform,
      handle: handle.trim(),
      url: url.trim(),
      followerCount,
      // Creator KHÔNG tự đặt isVerified — server ép literal(false) (CRE-002).
      isVerified: false,
    })),
    audienceMetrics: {
      followerCount,
      viewCount,
      updatedAt: new Date().toISOString(),
      isSelfReported: true,
    },
    serviceMode,
  });

  const addNiche = (): void => {
    const value = nicheInput.trim();
    if (!value) return;
    setNiches((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setNicheInput('');
  };

  const removeNiche = (niche: string): void => {
    setNiches((prev) => prev.filter((item) => item !== niche));
  };

  const handleNicheKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addNiche();
    }
  };

  const updateSocial = (index: number, patch: Partial<SocialDraft>): void => {
    setSocialAccounts((prev) =>
      prev.map((account, i) => (i === index ? { ...account, ...patch } : account)),
    );
  };

  const addSocial = (): void => {
    setSocialAccounts((prev) =>
      prev.length >= MAX_SOCIAL_ACCOUNTS
        ? prev
        : [...prev, { platform: 'tiktok', handle: '', url: '', followerCount: 0 }],
    );
  };

  const removeSocial = (index: number): void => {
    setSocialAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDay = (day: CreatorDayOfWeek): void => {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day],
    );
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file, {
      onSuccess: (owner) => setAvatarUrl(owner.avatarUrl),
      onError: (uploadError) => setError(uploadError),
    });
    event.target.value = '';
  };

  const handlePortfolioUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    upload.mutate(
      {
        file,
        caption: captionInput.trim() || undefined,
        category: categoryInput.trim() || undefined,
      },
      { onError: (uploadError) => setError(uploadError) },
    );
    event.target.value = '';
  };

  const handleAddLink = (): void => {
    const url = linkInput.trim();
    if (!url) return;
    addLink.mutate(
      {
        url,
        caption: captionInput.trim() || undefined,
        category: categoryInput.trim() || undefined,
      },
      {
        onSuccess: () => setLinkInput(''),
        onError: (linkError) => setError(linkError),
      },
    );
  };

  const handleRemoveItem = (itemId: string): void => {
    remove.mutate(itemId, { onError: (removeError) => setError(removeError) });
  };

  const handleSave = (event: FormEvent): void => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    updateProfile.mutate(buildProfileInput(), {
      onSuccess: () => {
        setSaved(true);
        // Lịch nhận việc là PATCH riêng (CRE-010) — gửi sau khi profile tồn tại để tránh race khi tạo mới.
        updateAvailability.mutate(
          { availableDays, isPaused },
          { onError: (availabilityError) => setError(availabilityError) },
        );
      },
      onError: (saveError) => setError(saveError),
    });
  };

  const handleSubmitReview = (): void => {
    setError(null);
    submitReview.mutate(undefined, {
      onSuccess: () => setSaved(true),
      onError: (submitError) => setError(submitError),
    });
  };

  const metricsUpdatedAt = profile?.audienceMetrics?.updatedAt ?? new Date().toISOString();

  return (
    <form className="auth-form onboarding-form" onSubmit={handleSave}>
      <FormError error={error} />
      {saved ? (
        <p className="form-success" role="status">
          Đã lưu hồ sơ.
        </p>
      ) : null}

      <section className="form-section" aria-labelledby="section-profile">
        <h2 className="form-section__title" id="section-profile">
          Hồ sơ
        </h2>
        <div className="form-grid">
          <label className="form-field">
            <span>Tên hiển thị</span>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={50}
              required
              disabled={readOnly}
            />
          </label>
          <label className="form-field">
            <span>Thành phố</span>
            <input
              type="text"
              className="input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={100}
              required
              disabled={readOnly}
            />
          </label>
          <div className="form-field form-grid--full">
            <span>Ảnh đại diện</span>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Ảnh đại diện" className="avatar-preview" />
            ) : (
              <div className="avatar-preview avatar-preview--empty">Chưa có ảnh</div>
            )}
            <label className="button button--secondary avatar-upload">
              {uploadAvatar.isPending ? 'Đang tải ảnh...' : 'Tải ảnh đại diện'}
              <input
                type="file"
                accept="image/*"
                className="file-input"
                onChange={handleAvatarUpload}
                disabled={readOnly}
              />
            </label>
          </div>
          <label className="form-field form-grid--full">
            <span>Giới thiệu</span>
            <textarea
              className="textarea"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
              required
              disabled={readOnly}
            />
          </label>
          <div className="form-field form-grid--full">
            <span>Lĩnh vực (niche)</span>
            <div className="niches">
              <input
                type="text"
                className="input"
                value={nicheInput}
                onChange={(event) => setNicheInput(event.target.value)}
                onKeyDown={handleNicheKeyDown}
                placeholder="VD: ẩm thực, thời trang"
                aria-label="Lĩnh vực (niche)"
                disabled={readOnly}
              />
              <button
                type="button"
                className="button button--secondary"
                onClick={addNiche}
                disabled={readOnly || nicheInput.trim() === ''}
              >
                Thêm lĩnh vực
              </button>
            </div>
            {niches.length > 0 ? (
              <ul className="niche-tags">
                {niches.map((niche) => (
                  <li key={niche} className="tag">
                    <span>{niche}</span>
                    <button
                      type="button"
                      className="tag__remove"
                      aria-label={`Xóa lĩnh vực ${niche}`}
                      onClick={() => removeNiche(niche)}
                      disabled={readOnly}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <label className="form-field">
            <span>Ngôn ngữ</span>
            <select
              className="select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as CreatorLanguage)}
              disabled={readOnly}
            >
              {CREATOR_LANGUAGES.map((option) => (
                <option key={option} value={option}>
                  {option === 'vi' ? 'Tiếng Việt' : 'English'}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="radio-group">
            <legend>Loại hình</legend>
            {CREATOR_TYPES.map((option) => (
              <label key={option} className="radio-option">
                <input
                  type="radio"
                  name="creatorType"
                  value={option}
                  checked={creatorType === option}
                  onChange={() => setCreatorType(option)}
                  disabled={readOnly}
                />
                <span>{CREATOR_TYPE_LABELS[option]}</span>
              </label>
            ))}
          </fieldset>
          <label className="form-field">
            <span>Hình thức</span>
            <select
              className="select"
              value={serviceMode}
              onChange={(event) => setServiceMode(event.target.value as ServiceMode)}
              disabled={readOnly}
            >
              {SERVICE_MODES.map((option) => (
                <option key={option} value={option}>
                  {SERVICE_MODE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="form-section" aria-labelledby="section-social">
        <h2 className="form-section__title" id="section-social">
          Mạng xã hội
        </h2>
        <p className="page__subtitle">Tối đa {MAX_SOCIAL_ACCOUNTS} tài khoản.</p>
        {socialAccounts.length === 0 ? (
          <p className="page__subtitle">Chưa có tài khoản nào.</p>
        ) : (
          socialAccounts.map((account, index) => (
            <div key={`${account.platform}-${index}`} className="social-row">
              <label className="form-field">
                <span>Nền tảng</span>
                <select
                  className="select"
                  value={account.platform}
                  onChange={(event) =>
                    updateSocial(index, { platform: event.target.value as SocialPlatform })
                  }
                  disabled={readOnly}
                >
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Handle</span>
                <input
                  type="text"
                  className="input"
                  value={account.handle}
                  onChange={(event) => updateSocial(index, { handle: event.target.value })}
                  placeholder="@username"
                  disabled={readOnly}
                />
              </label>
              <label className="form-field">
                <span>URL</span>
                <input
                  type="url"
                  className="input"
                  value={account.url}
                  onChange={(event) => updateSocial(index, { url: event.target.value })}
                  placeholder="https://..."
                  disabled={readOnly}
                />
              </label>
              <label className="form-field">
                <span>Followers</span>
                <input
                  type="number"
                  className="input"
                  value={account.followerCount}
                  onChange={(event) =>
                    updateSocial(index, { followerCount: Number(event.target.value) })
                  }
                  min={0}
                  disabled={readOnly}
                />
              </label>
              <div className="social-row__actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => removeSocial(index)}
                  disabled={readOnly}
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          ))
        )}
        <button
          type="button"
          className="button button--secondary"
          onClick={addSocial}
          disabled={readOnly || socialAccounts.length >= MAX_SOCIAL_ACCOUNTS}
        >
          Thêm tài khoản
        </button>
      </section>

      <section className="form-section" aria-labelledby="section-metrics">
        <h2 className="form-section__title" id="section-metrics">
          Chỉ số khán giả
        </h2>
        <div className="form-grid">
          <label className="form-field">
            <span>Followers</span>
            <input
              type="number"
              className="input"
              value={followerCount}
              onChange={(event) => setFollowerCount(Number(event.target.value))}
              min={0}
              disabled={readOnly}
            />
          </label>
          <label className="form-field">
            <span>Lượt xem trung bình</span>
            <input
              type="number"
              className="input"
              value={viewCount}
              onChange={(event) => setViewCount(Number(event.target.value))}
              min={0}
              disabled={readOnly}
            />
          </label>
          <p className="page__subtitle">
            Cập nhật lần cuối: {new Date(metricsUpdatedAt).toLocaleString('vi-VN')}
          </p>
        </div>
      </section>

      <section className="form-section" aria-labelledby="section-availability">
        <h2 className="form-section__title" id="section-availability">
          Lịch nhận việc
        </h2>
        <fieldset className="checkbox-group">
          <legend>Ngày trong tuần</legend>
          {CREATOR_DAYS_OF_WEEK.map((day) => (
            <label key={day} className="checkbox-option">
              <input
                type="checkbox"
                checked={availableDays.includes(day)}
                onChange={() => toggleDay(day)}
                disabled={readOnly}
              />
              <span>{CREATOR_DAY_OF_WEEK_LABELS[day]}</span>
            </label>
          ))}
        </fieldset>
        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={isPaused}
            onChange={(event) => setIsPaused(event.target.checked)}
            disabled={readOnly}
          />
          <span>Tạm dừng nhận booking mới</span>
        </label>
      </section>

      <section className="form-section" aria-labelledby="section-portfolio">
        <h2 className="form-section__title" id="section-portfolio">
          Portfolio
        </h2>
        <div className="portfolio-controls">
          <input
            type="text"
            className="input"
            value={captionInput}
            onChange={(event) => setCaptionInput(event.target.value)}
            placeholder="Chú thích (tùy chọn)"
            aria-label="Chú thích mục portfolio"
            disabled={readOnly}
          />
          <input
            type="text"
            className="input"
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder="Danh mục (tùy chọn)"
            aria-label="Danh mục mục portfolio"
            disabled={readOnly}
          />
          <label className="button button--secondary avatar-upload">
            {upload.isPending ? 'Đang tải lên...' : 'Tải ảnh/video lên'}
            <input
              type="file"
              accept="image/*,video/*"
              className="file-input"
              onChange={handlePortfolioUpload}
              disabled={readOnly}
            />
          </label>
        </div>
        <div className="portfolio-controls">
          <input
            type="url"
            className="input"
            value={linkInput}
            onChange={(event) => setLinkInput(event.target.value)}
            placeholder="https://... (thêm liên kết)"
            aria-label="URL liên kết portfolio"
            disabled={readOnly}
          />
          <button
            type="button"
            className="button button--secondary"
            onClick={handleAddLink}
            disabled={readOnly || linkInput.trim() === ''}
          >
            Thêm liên kết
          </button>
        </div>
        {portfolioItems.length > 0 ? (
          <ul className="portfolio-list">
            {portfolioItems.map((item) => (
              <li key={item.id} className="portfolio-item">
                <span>{item.type === 'link' ? item.url : (item.caption ?? item.url)}</span>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={readOnly || remove.isPending}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="page__subtitle">Chưa có mục portfolio.</p>
        )}
      </section>

      <div className="form-actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={readOnly || isIncomplete || updateProfile.isPending}
        >
          {updateProfile.isPending ? 'Đang lưu...' : 'Lưu hồ sơ'}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={handleSubmitReview}
          disabled={readOnly || isIncomplete || submitReview.isPending}
        >
          {submitReview.isPending ? 'Đang gửi...' : 'Gửi duyệt'}
        </button>
      </div>
    </form>
  );
};
