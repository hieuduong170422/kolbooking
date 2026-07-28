import { Link, useParams } from 'react-router';
import { useCreator } from '../features/creators/hooks/use-creator';
import { CREATOR_TYPE_LABELS } from '../features/creators/types/creator-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { formatCompactNumber, formatVnd } from '../shared/utils/format';

export const CreatorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: creator, isPending, isError, error, refetch } = useCreator(id);

  if (isPending) return <LoadingState message="Đang tải hồ sơ creator..." />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (!creator) return null;

  return (
    <section className="page">
      <Link to="/creators" className="back-link">
        ← Quay lại danh sách
      </Link>

      <div className="creator-detail">
        <header className="creator-detail__header">
          <h1>{creator.displayName}</h1>
          <span className="badge">{CREATOR_TYPE_LABELS[creator.creatorType]}</span>
        </header>
        <p className="creator-detail__meta">
          {creator.city} · ⭐ {creator.rating.toFixed(1)} · {creator.completedBookings} booking
          hoàn thành
        </p>
        <p className="creator-detail__bio">{creator.bio}</p>

        <h2>Lĩnh vực</h2>
        <ul className="tag-list">
          {creator.niches.map((niche) => (
            <li key={niche} className="tag">
              {niche}
            </li>
          ))}
        </ul>

        <h2>Kênh mạng xã hội</h2>
        <ul className="social-list">
          {creator.socialAccounts.map((account) => (
            <li key={`${account.platform}-${account.handle}`} className="social-list__item">
              <a href={account.url} target="_blank" rel="noopener noreferrer">
                {account.platform}: {account.handle}
              </a>
              <span>
                {formatCompactNumber(account.followerCount)} follower
                {account.isVerified ? ' · Đã xác minh' : ''}
              </span>
            </li>
          ))}
        </ul>

        <div className="creator-detail__price-box">
          <p>
            Giá từ <strong>{formatVnd(creator.priceFromVnd)}</strong>
          </p>
          <button type="button" className="button button--primary" disabled>
            Booking (sắp ra mắt)
          </button>
        </div>
      </div>
    </section>
  );
};
