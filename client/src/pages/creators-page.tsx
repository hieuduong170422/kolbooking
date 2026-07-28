import { useSearchParams } from 'react-router';
import { CreatorFilters } from '../features/creators/components/creator-filters';
import { CreatorList } from '../features/creators/components/creator-list';
import { useCreators } from '../features/creators/hooks/use-creators';
import type {
  CreatorListFilter,
  CreatorSortOption,
  CreatorType,
} from '../features/creators/types/creator-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { Pagination } from '../shared/components/pagination/pagination';

/** Filter state nằm trên URL để chia sẻ được link kết quả tìm kiếm (SRCH-003). */
const filterFromSearchParams = (params: URLSearchParams): CreatorListFilter => ({
  search: params.get('search') ?? undefined,
  creatorType: (params.get('creatorType') as CreatorType | null) ?? undefined,
  sort: (params.get('sort') as CreatorSortOption | null) ?? 'rating',
  page: Number(params.get('page') ?? '1') || 1,
  limit: 12,
});

const searchParamsFromFilter = (filter: CreatorListFilter): URLSearchParams => {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.creatorType) params.set('creatorType', filter.creatorType);
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

  return (
    <section className="page">
      <div className="page__header">
        <h1>Khám phá creator</h1>
        <p className="page__subtitle">
          Tìm nano/micro/UGC creator phù hợp với thương hiệu của bạn.
        </p>
      </div>

      <CreatorFilters filter={filter} onChange={applyFilter} />

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
    </section>
  );
};
