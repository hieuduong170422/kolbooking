import { LinkButton } from '../shared/components/ui';
import { CreatorList } from '../features/creators/components/creator-list';
import { useFavorites } from '../features/favorites/hooks/use-favorites';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';

/** Trang /saved — creator brand đã lưu (BRD-006). */
export const SavedCreatorsPage = () => {
  const { data, isPending, isError, refetch } = useFavorites();

  return (
    <section className="page">
      <div className="page__header">
        <h1>Creator đã lưu</h1>
        <p className="page__subtitle">
          Danh sách đồng bộ theo tài khoản — creator bị gỡ khỏi nền tảng sẽ không còn hiển thị.
        </p>
      </div>

      {isPending ? <LoadingState message="Đang tải danh sách đã lưu..." /> : null}
      {isError ? (
        <ErrorState message="Không tải được danh sách đã lưu." onRetry={() => void refetch()} />
      ) : null}

      {data !== undefined ? (
        data.length === 0 ? (
          <div className="feedback">
            <p className="feedback__title">Chưa lưu creator nào</p>
            <p>Bấm biểu tượng trái tim trên thẻ creator để lưu lại xem sau.</p>
            <LinkButton to="/creators">
              Khám phá creator
            </LinkButton>
          </div>
        ) : (
          <CreatorList creators={data} />
        )
      ) : null}
    </section>
  );
};
