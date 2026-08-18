import { useSearchParams } from 'react-router';
import { CreatorFilters } from '../features/creators/components/creator-filters';
import { CreatorList } from '../features/creators/components/creator-list';
import { useCreators } from '../features/creators/hooks/use-creators';
import {
  CREATOR_SORT_OPTIONS,
  SORT_LABELS,
  type CreatorListFilter,
  type CreatorSortOption,
  type CreatorType,
  type ServiceMode,
  type SocialPlatform,
} from '../features/creators/types/creator-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { Pagination } from '../shared/components/pagination/pagination';
import { Select } from '../shared/components/ui';

/** Đọc số từ URL; bỏ qua giá trị rác để filter không sinh NaN. */
const numberParam = (params: URLSearchParams, key: string): number | undefined => {
  const raw = params.get(key);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

/** Filter state nằm trên URL để chia sẻ được link kết quả tìm kiếm (SRCH-003). */
const filterFromSearchParams = (params: URLSearchParams): CreatorListFilter => ({
  search: params.get('search') ?? undefined,
  city: params.get('city') ?? undefined,
  creatorType: (params.get('creatorType') as CreatorType | null) ?? undefined,
  platform: (params.get('platform') as SocialPlatform | null) ?? undefined,
  serviceMode: (params.get('serviceMode') as ServiceMode | null) ?? undefined,
  minPriceVnd: numberParam(params, 'minPrice'),
  maxPriceVnd: numberParam(params, 'maxPrice'),
  minRating: numberParam(params, 'minRating'),
  sort: (params.get('sort') as CreatorSortOption | null) ?? 'rating',
  page: Number(params.get('page') ?? '1') || 1,
  limit: 12,
});

const searchParamsFromFilter = (filter: CreatorListFilter): URLSearchParams => {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.city) params.set('city', filter.city);
  if (filter.creatorType) params.set('creatorType', filter.creatorType);
  if (filter.platform) params.set('platform', filter.platform);
  if (filter.serviceMode) params.set('serviceMode', filter.serviceMode);
  if (filter.minPriceVnd !== undefined) params.set('minPrice', String(filter.minPriceVnd));
  if (filter.maxPriceVnd !== undefined) params.set('maxPrice', String(filter.maxPriceVnd));
  if (filter.minRating !== undefined) params.set('minRating', String(filter.minRating));
  if (filter.sort && filter.sort !== 'rating') params.set('sort', filter.sort);
  if (filter.page && filter.page > 1) params.set('page', String(filter.page));
  return params;
};

export const CreatorsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = filterFromSearchParams(searchParams);
  const { data, isPending, isError, error, refetch } = useCreators(filter);

  const applyFilter = (next: CreatorListFilter): void => {
    setSearchParams(searchParamsFromFilter(next), { replace: true });
  };

  const total = data?.meta?.total;

  return (
    <section className="page">
      <div className="page__header">
        <h1>Khám phá creator</h1>
        <p className="page__subtitle">
          Tìm nano/micro/UGC creator phù hợp với thương hiệu của bạn.
        </p>
      </div>

      <div className="search-layout">
        <div className="search-layout__rail">
          <CreatorFilters filter={filter} onChange={applyFilter} />
        </div>

        <div className="search-layout__results">
          <div className="results-bar">
            <p className="results-bar__count">
              {total !== undefined ? `${total} creator phù hợp` : 'Đang tìm...'}
            </p>
            <Select
              fieldClassName="results-bar__sort"
              label="Sắp xếp"
              options={CREATOR_SORT_OPTIONS.map((option) => ({
                value: option,
                label: SORT_LABELS[option],
              }))}
              value={filter.sort ?? 'rating'}
              onChange={(event) =>
                applyFilter({ ...filter, sort: event.target.value as CreatorSortOption, page: 1 })
              }
            />
          </div>

          {isPending ? <LoadingState /> : null}
          {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
          {data ? (
            <>
              <CreatorList creators={data.data} />
              {data.meta ? (
                <Pagination
                  meta={data.meta}
                  onPageChange={(page) => applyFilter({ ...filter, page })}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
};
