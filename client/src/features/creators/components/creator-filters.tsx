import {
  CREATOR_SORT_OPTIONS,
  CREATOR_TYPES,
  CREATOR_TYPE_LABELS,
  SORT_LABELS,
  type CreatorListFilter,
  type CreatorSortOption,
  type CreatorType,
} from '../types/creator-types';

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
