import {
  CREATOR_SORT_OPTIONS,
  CREATOR_TYPES,
  CREATOR_TYPE_LABELS,
  SERVICE_MODES,
  SERVICE_MODE_LABELS,
  SORT_LABELS,
  type CreatorListFilter,
  type CreatorSortOption,
  type CreatorType,
  type ServiceMode,
} from '../types/creator-types';

/** Các thành phố phổ biến từ dữ liệu seed — lọc theo chuỗi tự do (SRCH-003). */
const COMMON_CITIES = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'] as const;

interface CreatorFiltersProps {
  readonly filter: CreatorListFilter;
  readonly onChange: (next: CreatorListFilter) => void;
}

/** Thanh filter — mọi thay đổi tạo object filter MỚI và reset về trang 1. */
export const CreatorFilters = ({ filter, onChange }: CreatorFiltersProps) => {
  const patch = (changes: Partial<CreatorListFilter>): void => {
    onChange({ ...filter, ...changes, page: 1 });
  };

  return (
    <form className="creator-filters" role="search" onSubmit={(event) => event.preventDefault()}>
      <input
        type="search"
        className="input creator-filters__search"
        placeholder="Tìm theo tên, lĩnh vực..."
        aria-label="Tìm kiếm creator"
        value={filter.search ?? ''}
        onChange={(event) => patch({ search: event.target.value || undefined })}
      />
      <select
        className="input"
        aria-label="Loại creator"
        value={filter.creatorType ?? ''}
        onChange={(event) =>
          patch({ creatorType: (event.target.value || undefined) as CreatorType | undefined })
        }
      >
        <option value="">Tất cả loại</option>
        {CREATOR_TYPES.map((type) => (
          <option key={type} value={type}>
            {CREATOR_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <select
        className="input"
        aria-label="Hình thức nhận việc"
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
      <select
        className="input"
        aria-label="Thành phố"
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
      <select
        className="input"
        aria-label="Sắp xếp"
        value={filter.sort ?? 'rating'}
        onChange={(event) => patch({ sort: event.target.value as CreatorSortOption })}
      >
        {CREATOR_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </form>
  );
};
