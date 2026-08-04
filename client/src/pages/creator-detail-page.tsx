import { Link, useParams } from 'react-router';
import { useCreator } from '../features/creators/hooks/use-creator';
import {
  CREATOR_LANGUAGE_LABELS,
  CREATOR_TYPE_LABELS,
  SERVICE_MODE_LABELS,
  type PortfolioItem,
} from '../features/creators/types/creator-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { formatCompactNumber, formatVnd } from '../shared/utils/format';

/** Tên miền của link portfolio — tránh hiển thị URL dài (CRE-004). */
const linkHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const renderPortfolioItem = (item: PortfolioItem) => (
  <div key={item.id} className="creator-portfolio__item">
    {item.type === 'image' ? (
      <a href={item.url} target="_blank" rel="noopener noreferrer">
        <img
          className="creator-portfolio__media"
          src={item.thumbnailUrl ?? item.url}
          alt={item.caption ?? 'Ảnh portfolio'}
          loading="lazy"
        />
      </a>
    ) : null}
    {item.type === 'video' ? (
      <video className="creator-portfolio__media" src={item.url} controls preload="metadata" />
    ) : null}
    {item.type === 'link' ? (
      <a
        className="creator-portfolio__link"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {linkHostname(item.url)}
      </a>
    ) : null}
    <div className="creator-portfolio__body">
      {item.caption ? <p className="creator-portfolio__caption">{item.caption}</p> : null}
      {item.category ? <p className="creator-portfolio__category">{item.category}</p> : null}
    </div>
  </div>
);

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
          {creator.avatarUrl ? (
            <img
              className="creator-detail__avatar"
              src={creator.avatarUrl}
              alt={`Ảnh đại diện ${creator.displayName}`}
            />
          ) : null}
          <h1>{creator.displayName}</h1>
          <span className="badge">{CREATOR_TYPE_LABELS[creator.creatorType]}</span>
        </header>
        <p className="creator-detail__meta">
          {creator.city} · ⭐ {creator.rating.toFixed(1)} · {creator.completedBookings} booking
          hoàn thành · {SERVICE_MODE_LABELS[creator.serviceMode]} ·{' '}
          {CREATOR_LANGUAGE_LABELS[creator.language]}
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

        <h2>Audience</h2>
        {creator.audienceMetrics ? (
          <div className="creator-metrics">
            <p>
              <strong>{formatCompactNumber(creator.audienceMetrics.followerCount)}</strong> follower
            </p>
            <p>
              <strong>{formatCompactNumber(creator.audienceMetrics.viewCount)}</strong> lượt xem
            </p>
            <p className="creator-metrics__note">
              Số liệu tự khai báo · cập nhật{' '}
              {new Date(creator.audienceMetrics.updatedAt).toLocaleDateString('vi-VN')} (CRE-005)
            </p>
          </div>
        ) : (
          <p className="creator-detail__empty">Chưa khai báo.</p>
        )}

        <h2>Portfolio</h2>
        {creator.portfolioItems.length > 0 ? (
          <div className="creator-portfolio">{creator.portfolioItems.map(renderPortfolioItem)}</div>
        ) : (
          <p className="creator-detail__empty">Chưa có portfolio.</p>
        )}

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
