import { IconStar } from '../../../shared/components/icons';
import { Button, Input, Select, ToggleChips } from '../../../shared/components/ui';
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
          <Button
            variant="link"
            onClick={() => onChange({ sort: filter.sort, page: 1, limit: filter.limit })}
          >
            Xóa lọc ({activeCount})
          </Button>
        ) : null}
      </div>

      <Input
        type="search"
        placeholder="Tìm theo tên, lĩnh vực..."
        aria-label="Tìm kiếm creator"
        value={filter.search ?? ''}
        onChange={(event) => patch({ search: event.target.value || undefined })}
      />

      <ToggleChips
        legend="Loại creator"
        options={CREATOR_TYPES.map((type) => ({
          key: type,
          value: type,
          label: CREATOR_TYPE_LABELS[type],
        }))}
        isActive={(type) => filter.creatorType === type}
        onToggle={(type) => patch({ creatorType: filter.creatorType === type ? undefined : type })}
      />

      <ToggleChips
        legend="Nền tảng"
        options={SOCIAL_PLATFORMS.map((platform) => ({
          key: platform,
          value: platform,
          label: platform,
        }))}
        isActive={(platform) => filter.platform === platform}
        onToggle={(platform) =>
          patch({ platform: filter.platform === platform ? undefined : platform })
        }
      />

      <ToggleChips
        legend="Ngân sách"
        stack
        options={PRICE_BANDS.map((band) => ({ key: band.label, value: band, label: band.label }))}
        isActive={isPriceBandActive}
        onToggle={(band) =>
          patch(
            isPriceBandActive(band)
              ? { minPriceVnd: undefined, maxPriceVnd: undefined }
              : { minPriceVnd: band.min, maxPriceVnd: band.max },
          )
        }
      />

      <ToggleChips
        legend="Đánh giá tối thiểu"
        options={RATING_BANDS.map((rating) => ({
          key: String(rating),
          value: rating,
          label: (
            <>
              {rating.toFixed(1)} <IconStar className="icon-star" /> trở lên
            </>
          ),
        }))}
        isActive={(rating) => filter.minRating === rating}
        onToggle={(rating) => patch({ minRating: filter.minRating === rating ? undefined : rating })}
      />

      <Select
        label="Thành phố"
        placeholder="Tất cả thành phố"
        options={COMMON_CITIES.map((city) => ({ value: city, label: city }))}
        value={filter.city ?? ''}
        onChange={(city) => patch({ city: city || undefined })}
      />

      <Select
        label="Hình thức nhận việc"
        placeholder="Tất cả hình thức"
        options={SERVICE_MODES.map((mode) => ({ value: mode, label: SERVICE_MODE_LABELS[mode] }))}
        value={filter.serviceMode ?? ''}
        onChange={(mode) => patch({ serviceMode: (mode || undefined) as ServiceMode | undefined })}
      />
    </form>
  );
};
