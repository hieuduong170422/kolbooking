import {
  CREATOR_TYPES,
  CREATOR_TYPE_LABELS,
  SERVICE_MODES,
  SERVICE_MODE_LABELS,
  SOCIAL_PLATFORMS,
  type CreatorListFilter,
  type ServiceMode,
} from '../types/creator-types';

/** Các thành phố phổ biến từ dữ liệu seed — lọc theo chuỗi tự do (SRCH-003). */
const COMMON_CITIES = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'] as const;

/** Khoảng giá đặt sẵn — brand nghĩ theo ngân sách chứ không theo con số lẻ. */
const PRICE_BANDS = [
  { label: 'Dưới 1 triệu', min: undefined, max: 1_000_000 },
  { label: '1 – 3 triệu', min: 1_000_000, max: 3_000_000 },
  { label: '3 – 5 triệu', min: 3_000_000, max: 5_000_000 },
  { label: 'Trên 5 triệu', min: 5_000_000, max: undefined },
] as const;

const RATING_BANDS = [4.5, 4, 3.5] as const;

interface CreatorFiltersProps {
  readonly filter: CreatorListFilter;
  readonly onChange: (next: CreatorListFilter) => void;
}

/**
 * Rail bộ lọc (SRCH-003) — mỗi thay đổi tạo filter MỚI và reset về trang 1.
 * Các nhóm chọn-một dùng nút toggle (aria-pressed) thay vì radio để bấm lại
 * là bỏ chọn; radio không có hành vi đó.
 */
export const CreatorFilters = ({ filter, onChange }: CreatorFiltersProps) => {
  const patch = (changes: Partial<CreatorListFilter>): void => {
    onChange({ ...filter, ...changes, page: 1 });
  };

  const activeCount = [
    filter.search,
    filter.city,
    filter.creatorType,
    filter.platform,
    filter.serviceMode,
    filter.minRating,
    filter.minPriceVnd ?? filter.maxPriceVnd,
  ].filter((value) => value !== undefined && value !== '').length;

  const isPriceBandActive = (band: (typeof PRICE_BANDS)[number]): boolean =>
    filter.minPriceVnd === band.min && filter.maxPriceVnd === band.max;

  return (
    <form className="filter-rail" role="search" onSubmit={(event) => event.preventDefault()}>
      <div className="filter-rail__head">
        <span className="filter-rail__title">Bộ lọc</span>
        {activeCount > 0 ? (
          <button
            type="button"
            className="button-link"
            onClick={() => onChange({ sort: filter.sort, page: 1, limit: filter.limit })}
          >
            Xóa lọc ({activeCount})
          </button>
        ) : null}
      </div>

      <input
        type="search"
        className="input"
        placeholder="Tìm theo tên, lĩnh vực..."
        aria-label="Tìm kiếm creator"
        value={filter.search ?? ''}
        onChange={(event) => patch({ search: event.target.value || undefined })}
      />

      <div className="filter-group" role="group" aria-label="Loại creator">
        <p className="filter-group__legend">Loại creator</p>
        <div className="chip-row">
          {CREATOR_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="chip-btn"
              aria-pressed={filter.creatorType === type}
              onClick={() =>
                patch({ creatorType: filter.creatorType === type ? undefined : type })
              }
            >
              {CREATOR_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group" role="group" aria-label="Nền tảng">
        <p className="filter-group__legend">Nền tảng</p>
        <div className="chip-row">
          {SOCIAL_PLATFORMS.map((platform) => (
            <button
              key={platform}
              type="button"
              className="chip-btn"
              aria-pressed={filter.platform === platform}
              onClick={() =>
                patch({ platform: filter.platform === platform ? undefined : platform })
              }
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group" role="group" aria-label="Ngân sách">
        <p className="filter-group__legend">Ngân sách</p>
        <div className="chip-row chip-row--stack">
          {PRICE_BANDS.map((band) => (
            <button
              key={band.label}
              type="button"
              className="chip-btn"
              aria-pressed={isPriceBandActive(band)}
              onClick={() =>
                patch(
                  isPriceBandActive(band)
                    ? { minPriceVnd: undefined, maxPriceVnd: undefined }
                    : { minPriceVnd: band.min, maxPriceVnd: band.max },
                )
              }
            >
              {band.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group" role="group" aria-label="Đánh giá tối thiểu">
        <p className="filter-group__legend">Đánh giá tối thiểu</p>
        <div className="chip-row">
          {RATING_BANDS.map((rating) => (
            <button
              key={rating}
              type="button"
              className="chip-btn"
              aria-pressed={filter.minRating === rating}
              onClick={() =>
                patch({ minRating: filter.minRating === rating ? undefined : rating })
              }
            >
              {rating.toFixed(1)} ★ trở lên
            </button>
          ))}
        </div>
      </div>

      <label className="form-field">
        <span>Thành phố</span>
        <select
          className="select"
          value={filter.city ?? ''}
          onChange={(event) => patch({ city: event.target.value || undefined })}
        >
          <option value="">Tất cả thành phố</option>
          {COMMON_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>Hình thức nhận việc</span>
        <select
          className="select"
          value={filter.serviceMode ?? ''}
          onChange={(event) =>
            patch({ serviceMode: (event.target.value || undefined) as ServiceMode | undefined })
          }
        >
          <option value="">Tất cả hình thức</option>
          {SERVICE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {SERVICE_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
};
