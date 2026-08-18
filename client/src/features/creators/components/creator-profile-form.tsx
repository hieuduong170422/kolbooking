import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { ApiClientError } from '../../../shared/api/api-types';
import { IconLink, IconPlus, IconTrash, IconUpload } from '../../../shared/components/icons';
import {
  Button,
  ChipGroup,
  FileButton,
  IconButton,
  Input,
  SegmentedControl,
  Select,
  Textarea,
} from '../../../shared/components/ui';
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
  CREATOR_LANGUAGE_LABELS,
  CREATOR_LANGUAGES,
  CREATOR_TYPE_LABELS,
  CREATOR_TYPES,
  SERVICE_MODES,
  SERVICE_MODE_LABELS,
  type CreatorDayOfWeek,
  type CreatorLanguage,
  type CreatorOwner,
  type CreatorProfileInput,
  type CreatorType,
  type ServiceMode,
} from '../types/creator-types';
import { ProfileChecklist, type ChecklistItem } from './profile-checklist';
import { SocialAccountFields, type SocialDraft } from './social-account-fields';

const MAX_SOCIAL_ACCOUNTS = 4;
const BIO_MAX_LENGTH = 500;

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

/** Tiêu đề section có số thứ tự — hồ sơ đi theo 5 bước rõ ràng. */
const SectionHead = ({
  step,
  id,
  title,
  description,
}: {
  step: number;
  id: string;
  title: string;
  description: string;
}) => (
  <header className="onb-section__head">
    <span className="onb-section__num" aria-hidden="true">
      {step}
    </span>
    <div>
      <h2 className="onb-section__title" id={id}>
        {title}
      </h2>
      <p className="onb-section__desc">{description}</p>
    </div>
  </header>
);

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
  const [availableDays, setAvailableDays] = useState<readonly CreatorDayOfWeek[]>(() =>
    profile ? [...profile.availability.availableDays] : [],
  );
  const [isPaused, setIsPaused] = useState(profile?.availability.isPaused ?? false);
  const [linkInput, setLinkInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const portfolioItems = profile?.portfolioItems ?? [];

  // So khớp min của server schema (CRE-002): displayName ≥2, bio ≥10, city ≥2,
  // niches ≥1 và mỗi niche trim ≥2 — tránh lỗi VALIDATION_ERROR phía server.
  const isIncomplete =
    displayName.trim().length < 2 ||
    bio.trim().length < 10 ||
    city.trim().length < 2 ||
    niches.length === 0 ||
    niches.some((niche) => niche.trim().length < 2);

  /** Checklist bám đúng điều kiện submitForReview phía server (CRE-001). */
  const checklist: readonly ChecklistItem[] = [
    {
      label: 'Tên hiển thị',
      done: displayName.trim().length >= 2,
      hint: 'tối thiểu 2 ký tự',
    },
    { label: 'Thành phố', done: city.trim().length >= 2, hint: 'tối thiểu 2 ký tự' },
    { label: 'Giới thiệu', done: bio.trim().length >= 10, hint: 'tối thiểu 10 ký tự' },
    {
      label: 'Lĩnh vực',
      done: niches.length > 0 && niches.every((niche) => niche.trim().length >= 2),
      hint: 'thêm ít nhất 1 lĩnh vực',
    },
    { label: 'Ảnh đại diện', done: avatarUrl !== null, hint: 'bắt buộc khi gửi duyệt' },
  ];

  const buildProfileInput = (): CreatorProfileInput => ({
    displayName: displayName.trim(),
    avatarUrl: avatarUrl ?? null,
    bio: bio.trim(),
    city: city.trim(),
    niches,
    language,
    creatorType,
    socialAccounts: socialAccounts.map(({ platform, handle, url, followerCount: followers }) => ({
      platform,
      handle: handle.trim(),
      url: url.trim(),
      followerCount: followers,
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

  const handleAvatarUpload = (file: File): void => {
    uploadAvatar.mutate(file, {
      onSuccess: (owner) => setAvatarUrl(owner.avatarUrl),
      onError: (uploadError) => setError(uploadError),
    });
  };

  const handlePortfolioUpload = (file: File): void => {
    upload.mutate(
      {
        file,
        caption: captionInput.trim() || undefined,
        category: categoryInput.trim() || undefined,
      },
      { onError: (uploadError) => setError(uploadError) },
    );
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

  const panelNote = readOnly
    ? 'Hồ sơ đang được xử lý — mở khóa sau khi đội vận hành phản hồi.'
    : avatarUrl === null
      ? 'Cần ảnh đại diện trước khi gửi duyệt.'
      : 'Đội vận hành thường phản hồi trong 24–48 giờ.';

  return (
    <form className="onb-layout" onSubmit={handleSave}>
      <div className="onb-main">
        <FormError error={error} />
        {saved ? (
          <p className="form-success" role="status">
            Đã lưu hồ sơ.
          </p>
        ) : null}

        {/* 1. Thông tin cơ bản */}
        <section className="onb-section" aria-labelledby="section-profile">
          <SectionHead
            step={1}
            id="section-profile"
            title="Thông tin cơ bản"
            description="Đây là những gì brand nhìn thấy đầu tiên khi tìm creator."
          />

          <div className="avatar-row">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Ảnh đại diện" className="avatar-preview" />
            ) : (
              <div className="avatar-preview avatar-preview--empty" aria-hidden="true">
                {displayName.trim().charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div className="avatar-row__body">
              <span className="form-field__label">Ảnh đại diện</span>
              <p className="onb-hint">JPG/PNG, tối đa 5MB. Ảnh rõ mặt giúp brand tin tưởng hơn.</p>
              <FileButton
                icon={<IconUpload />}
                label={uploadAvatar.isPending ? 'Đang tải ảnh...' : 'Tải ảnh lên'}
                accept="image/*"
                onSelect={handleAvatarUpload}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="field-grid">
            <Input
              label="Tên hiển thị"
              span="half"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
              disabled={readOnly}
            />
            <Input
              label="Thành phố"
              span="half"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              minLength={2}
              maxLength={60}
              placeholder="VD: Hà Nội"
              required
              disabled={readOnly}
            />

            <Textarea
              label="Giới thiệu"
              span="full"
              counter={`${bio.trim().length}/${BIO_MAX_LENGTH}`}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              minLength={10}
              maxLength={BIO_MAX_LENGTH}
              placeholder="Bạn làm nội dung gì, cho tệp khán giả nào, thế mạnh của bạn là gì?"
              required
              disabled={readOnly}
            />

            <div className="form-field field--full">
              <span className="form-field__label">Lĩnh vực (niche)</span>
              <div className="niches">
                <Input
                  value={nicheInput}
                  onChange={(event) => setNicheInput(event.target.value)}
                  onKeyDown={handleNicheKeyDown}
                  maxLength={30}
                  placeholder="VD: ẩm thực, thời trang"
                  aria-label="Lĩnh vực (niche)"
                  disabled={readOnly}
                />
                <Button onClick={addNiche} disabled={readOnly || nicheInput.trim() === ''}>
                  Thêm lĩnh vực
                </Button>
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
              ) : (
                <p className="onb-hint">Gõ tên lĩnh vực rồi nhấn Enter để thêm.</p>
              )}
            </div>

            <SegmentedControl
              className="form-field field--full"
              legend="Loại hình"
              name="creatorType"
              value={creatorType}
              options={CREATOR_TYPES.map((option) => ({
                value: option,
                label: CREATOR_TYPE_LABELS[option],
              }))}
              onChange={setCreatorType}
              disabled={readOnly}
            />

            <Select
              label="Hình thức nhận việc"
              span="half"
              options={SERVICE_MODES.map((option) => ({
                value: option,
                label: SERVICE_MODE_LABELS[option],
              }))}
              value={serviceMode}
              onChange={(mode) => setServiceMode(mode as ServiceMode)}
              disabled={readOnly}
            />
            <Select
              label="Ngôn ngữ"
              span="half"
              options={CREATOR_LANGUAGES.map((option) => ({
                value: option,
                label: CREATOR_LANGUAGE_LABELS[option],
              }))}
              value={language}
              onChange={(next) => setLanguage(next as CreatorLanguage)}
              disabled={readOnly}
            />
          </div>
        </section>

        {/* 2. Kênh mạng xã hội */}
        <section className="onb-section" aria-labelledby="section-social">
          <SectionHead
            step={2}
            id="section-social"
            title="Kênh mạng xã hội"
            description={`Khai báo tối đa ${MAX_SOCIAL_ACCOUNTS} kênh — đội duyệt đối chiếu để xác minh.`}
          />
          {socialAccounts.length === 0 ? (
            <p className="onb-empty">Chưa khai báo kênh nào.</p>
          ) : (
            <div className="social-list-edit">
              {socialAccounts.map((account, index) => (
                <SocialAccountFields
                  key={`${account.platform}-${index}`}
                  account={account}
                  index={index}
                  readOnly={readOnly}
                  onChange={(patch) => updateSocial(index, patch)}
                  onRemove={() => removeSocial(index)}
                />
              ))}
            </div>
          )}
          <Button
            className="onb-add"
            icon={<IconPlus />}
            onClick={addSocial}
            disabled={readOnly || socialAccounts.length >= MAX_SOCIAL_ACCOUNTS}
          >
            Thêm tài khoản
          </Button>
        </section>

        {/* 3. Chỉ số khán giả */}
        <section className="onb-section" aria-labelledby="section-metrics">
          <SectionHead
            step={3}
            id="section-metrics"
            title="Chỉ số khán giả"
            description="Số liệu tự khai báo — hiển thị công khai kèm nhãn để brand biết nguồn."
          />
          <div className="field-grid">
            <Input
              label="Followers"
              span="half"
              type="number"
              value={followerCount}
              onChange={(event) => setFollowerCount(Number(event.target.value))}
              min={0}
              disabled={readOnly}
            />
            <Input
              label="Lượt xem trung bình"
              span="half"
              type="number"
              value={viewCount}
              onChange={(event) => setViewCount(Number(event.target.value))}
              min={0}
              disabled={readOnly}
            />
          </div>
          <p className="onb-hint">
            Cập nhật lần cuối: {new Date(metricsUpdatedAt).toLocaleString('vi-VN')}
          </p>
        </section>

        {/* 4. Lịch nhận việc */}
        <section className="onb-section" aria-labelledby="section-availability">
          <SectionHead
            step={4}
            id="section-availability"
            title="Lịch nhận việc"
            description="Ngày bạn rảnh quay/dựng — brand dựa vào đây để chọn deadline."
          />
          <ChipGroup
            legend="Ngày trong tuần"
            value={availableDays}
            options={CREATOR_DAYS_OF_WEEK.map((day) => ({
              value: day,
              label: CREATOR_DAY_OF_WEEK_LABELS[day],
            }))}
            onChange={setAvailableDays}
            disabled={readOnly}
          />
          <label className="onb-pause">
            <input
              type="checkbox"
              checked={isPaused}
              onChange={(event) => setIsPaused(event.target.checked)}
              disabled={readOnly}
            />
            <span>
              <strong>Tạm dừng nhận booking mới</strong>
              <em>Hồ sơ vẫn hiển thị nhưng brand không gửi được yêu cầu mới.</em>
            </span>
          </label>
        </section>

        {/* 5. Portfolio */}
        <section className="onb-section" aria-labelledby="section-portfolio">
          <SectionHead
            step={5}
            id="section-portfolio"
            title="Portfolio"
            description="Vài sản phẩm tiêu biểu — thứ thuyết phục brand nhanh nhất."
          />

          <div className="field-grid">
            <Input
              label="Chú thích (tùy chọn)"
              span="half"
              value={captionInput}
              onChange={(event) => setCaptionInput(event.target.value)}
              placeholder="VD: Review quán cà phê Hoàn Kiếm"
              disabled={readOnly}
            />
            <Input
              label="Danh mục (tùy chọn)"
              span="half"
              value={categoryInput}
              onChange={(event) => setCategoryInput(event.target.value)}
              placeholder="VD: f&b"
              disabled={readOnly}
            />
          </div>
          <p className="onb-hint">Hai ô trên áp dụng cho mục bạn thêm ngay sau đây.</p>

          <FileButton
            dropzone
            icon={<IconUpload />}
            label={upload.isPending ? 'Đang tải lên...' : 'Tải ảnh hoặc video lên'}
            hint="Ảnh tối đa 5MB · Video tối đa 50MB"
            accept="image/*,video/*"
            onSelect={handlePortfolioUpload}
            disabled={readOnly}
          />

          <div className="link-row">
            <Input
              type="url"
              value={linkInput}
              onChange={(event) => setLinkInput(event.target.value)}
              placeholder="https://... (thêm liên kết bài đăng)"
              aria-label="URL liên kết portfolio"
              disabled={readOnly}
            />
            <Button
              icon={<IconLink />}
              onClick={handleAddLink}
              disabled={readOnly || linkInput.trim() === ''}
            >
              Thêm liên kết
            </Button>
          </div>

          {portfolioItems.length > 0 ? (
            <ul className="portfolio-list">
              {portfolioItems.map((item) => (
                <li key={item.id} className="portfolio-item">
                  {item.type === 'image' ? (
                    <img
                      className="portfolio-item__thumb"
                      src={item.thumbnailUrl ?? item.url}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="portfolio-item__thumb portfolio-item__thumb--icon">
                      {item.type === 'video' ? '▶' : '↗'}
                    </span>
                  )}
                  <span className="portfolio-item__text">
                    {item.caption ?? (item.type === 'link' ? item.url : 'Không có chú thích')}
                    {item.category ? <em>{item.category}</em> : null}
                  </span>
                  <IconButton
                    label="Xóa mục portfolio"
                    title="Xóa"
                    tone="danger"
                    icon={<IconTrash />}
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={readOnly || remove.isPending}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="onb-empty">Chưa có mục portfolio.</p>
          )}
        </section>
      </div>

      {/* Panel tiến độ + hành động — luôn nhìn thấy khi cuộn (desktop) */}
      <aside className="onb-aside">
        <div className="onb-panel">
          <h2 className="onb-panel__title">Tiến độ hồ sơ</h2>
          <ProfileChecklist items={checklist} />
          <div className="onb-panel__actions">
            <Button
              type="submit"
              variant="primary"
              loading={updateProfile.isPending}
              disabled={readOnly || isIncomplete}
            >
              {updateProfile.isPending ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </Button>
            <Button
              loading={submitReview.isPending}
              disabled={readOnly || isIncomplete}
              onClick={handleSubmitReview}
            >
              {submitReview.isPending ? 'Đang gửi...' : 'Gửi duyệt'}
            </Button>
          </div>
          <p className="onb-panel__note">{panelNote}</p>
        </div>
      </aside>
    </form>
  );
};
