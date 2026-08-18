import { Button, Modal } from '../../../shared/components/ui';
import {
  CREATOR_DAY_OF_WEEK_LABELS,
  CREATOR_LANGUAGE_LABELS,
  CREATOR_STATUS_LABELS,
  CREATOR_TYPE_LABELS,
  SERVICE_MODE_LABELS,
  type CreatorAdmin,
  type PortfolioItem,
} from '../types/creator-types';
import { formatCompactNumber, formatVnd } from '../../../shared/utils/format';

// Tên miền của link portfolio — tránh hiển thị URL dài (CRE-004, pattern từ creator-detail-page).
const linkHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

// Nhãn loại mục portfolio trong modal — item link hiển thị hostname, ảnh/video hiển thị loại (CRE-004).
const PORTFOLIO_ITEM_LABELS: Record<PortfolioItem['type'], string> = {
  image: 'Ảnh',
  video: 'Video',
  link: 'Liên kết',
};

interface CreatorDetailModalProps {
  readonly creator: CreatorAdmin;
  readonly onClose: () => void;
}

/**
 * Modal chi tiết hồ sơ creator cho admin — render toàn bộ dữ liệu CreatorAdmin
 * đã có trong queue (CRE-008), hoạt động ở MỌI trạng thái mà không cần endpoint
 * public detail (server chỉ trả creator verified — BR-001).
 */
export const CreatorDetailModal = ({ creator, onClose }: CreatorDetailModalProps) => {
  return (
    <Modal
      title="Chi tiết hồ sơ"
      cardClassName="creator-modal__card"
      onClose={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >

        <div className="creator-modal__identity">
          {creator.avatarUrl !== null ? (
            <img className="review-row__avatar" src={creator.avatarUrl} alt="" />
          ) : (
            <span className="review-row__avatar review-row__avatar--fallback" aria-hidden="true">
              {creator.displayName.charAt(0)}
            </span>
          )}
          <div>
            <div className="creator-modal__heading">
              <span className="creator-modal__name">{creator.displayName}</span>
              <span className="badge">{CREATOR_STATUS_LABELS[creator.status]}</span>
            </div>
            <p className="creator-modal__email">{creator.userEmail}</p>
          </div>
        </div>

        {creator.statusReason !== null ? (
          <p className="status-banner status-banner--warning">
            <strong>Lý do:</strong> {creator.statusReason}
          </p>
        ) : null}

        <dl className="creator-modal__grid">
          <div className="creator-modal__grid-item">
            <dt>Thành phố</dt>
            <dd>{creator.city}</dd>
          </div>
          <div className="creator-modal__grid-item">
            <dt>Loại creator</dt>
            <dd>{CREATOR_TYPE_LABELS[creator.creatorType]}</dd>
          </div>
          <div className="creator-modal__grid-item">
            <dt>Ngôn ngữ</dt>
            <dd>{CREATOR_LANGUAGE_LABELS[creator.language]}</dd>
          </div>
          <div className="creator-modal__grid-item">
            <dt>Hình thức</dt>
            <dd>{SERVICE_MODE_LABELS[creator.serviceMode]}</dd>
          </div>
          <div className="creator-modal__grid-item">
            <dt>Giá từ</dt>
            <dd>{formatVnd(creator.priceFromVnd)}</dd>
          </div>
          <div className="creator-modal__grid-item">
            <dt>Đánh giá</dt>
            <dd>⭐ {creator.rating.toFixed(1)}</dd>
          </div>
          <div className="creator-modal__grid-item">
            <dt>Booking hoàn thành</dt>
            <dd>{creator.completedBookings}</dd>
          </div>
          <div className="creator-modal__grid-item">
            <dt>Ngày tạo</dt>
            <dd>{new Date(creator.createdAt).toLocaleDateString('vi-VN')}</dd>
          </div>
        </dl>

        <div className="creator-modal__section">
          <h3>Giới thiệu</h3>
          <p>{creator.bio}</p>
        </div>

        <div className="creator-modal__section">
          <h3>Lĩnh vực</h3>
          <ul className="tag-list">
            {creator.niches.map((niche) => (
              <li key={niche} className="tag">
                {niche}
              </li>
            ))}
          </ul>
        </div>

        <div className="creator-modal__section">
          <h3>Kênh mạng xã hội</h3>
          {creator.socialAccounts.length > 0 ? (
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
          ) : (
            <p className="creator-modal__empty">Chưa khai báo.</p>
          )}
        </div>

        <div className="creator-modal__section">
          <h3>Audience</h3>
          {creator.audienceMetrics !== null ? (
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
            <p className="creator-modal__empty">Chưa khai báo.</p>
          )}
        </div>

        <div className="creator-modal__section">
          <h3>Lịch nhận việc</h3>
          {creator.availability.availableDays.length > 0 ? (
            <ul className="tag-list">
              {creator.availability.availableDays.map((day) => (
                <li key={day} className="tag">
                  {CREATOR_DAY_OF_WEEK_LABELS[day]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="creator-modal__empty">Chưa khai báo.</p>
          )}
          {creator.availability.isPaused ? (
            <p className="creator-modal__paused">Đang tạm dừng nhận việc.</p>
          ) : null}
        </div>

        <div className="creator-modal__section">
          <h3>Portfolio</h3>
          {creator.portfolioItems.length > 0 ? (
            <ul className="creator-modal__portfolio">
              {creator.portfolioItems.map((item) => (
                <li key={item.id} className="creator-modal__portfolio-item">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.type === 'link' ? linkHostname(item.url) : PORTFOLIO_ITEM_LABELS[item.type]}
                  </a>
                  {item.caption !== null ? (
                    <span className="creator-modal__portfolio-caption">{item.caption}</span>
                  ) : null}
                  {item.category !== null ? (
                    <span className="creator-modal__portfolio-category">{item.category}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="creator-modal__empty">Chưa có portfolio.</p>
          )}
        </div>

    </Modal>
  );
};
