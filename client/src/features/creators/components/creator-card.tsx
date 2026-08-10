import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatCompactNumber, formatVnd } from '../../../shared/utils/format';
import { CREATOR_TYPE_LABELS, type Creator } from '../types/creator-types';

const creatorInitials = (displayName: string): string =>
  displayName
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

/**
 * Palette cover tuyển chọn quanh hệ Tím Măng Cụt — chọn ổn định theo tên
 * (không random) để mỗi creator giữ một màu nhất quán giữa các lần render.
 */
const COVER_GRADIENTS = [
  'linear-gradient(150deg, #8b4ddb, #43167a)', // tím măng cụt
  'linear-gradient(150deg, #b65fa8, #6d2260)', // hồng mận
  'linear-gradient(150deg, #e8a020, #9a5b08)', // vàng nghệ
  'linear-gradient(150deg, #2f9e8f, #14574e)', // xanh ngọc
  'linear-gradient(150deg, #5b7bd6, #2b3f8f)', // xanh chàm
  'linear-gradient(150deg, #d96f4b, #8f3a1e)', // cam đất
] as const;

const coverGradient = (displayName: string): string => {
  let hash = 0;
  for (const char of displayName) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length] as string;
};

/**
 * Card creator kiểu "cover-first" — ảnh/khối màu là hero, thông tin xếp dưới
 * (nguyên tắc design "Nội dung là hero"). Toàn card là link sang detail.
 */
interface CreatorCardProps {
  readonly creator: Creator;
  /** Slot góc cover — vd nút lưu creator. Card không tự phụ thuộc auth/query. */
  readonly action?: ReactNode;
}

export const CreatorCard = ({ creator, action }: CreatorCardProps) => {
  return (
    <Link to={`/creators/${creator.id}`} className="creator-card">
      <div
        className="creator-card__cover"
        aria-hidden="true"
        style={creator.avatarUrl ? undefined : { background: coverGradient(creator.displayName) }}
      >
        {creator.avatarUrl ? (
          <img className="creator-card__photo" src={creator.avatarUrl} alt="" loading="lazy" />
        ) : (
          <span className="creator-card__initials">{creatorInitials(creator.displayName)}</span>
        )}
        <span className="creator-card__type">{CREATOR_TYPE_LABELS[creator.creatorType]}</span>
      </div>
      {action}
      <div className="creator-card__body">
        <div className="creator-card__heading">
          <h3 className="creator-card__name">{creator.displayName}</h3>
        </div>
        <p className="creator-card__meta">
          {creator.city} · ⭐ {creator.rating.toFixed(1)} · {creator.completedBookings} booking
        </p>
        <p className="creator-card__bio">{creator.bio}</p>
        <ul className="creator-card__socials">
          {creator.socialAccounts.slice(0, 2).map((account) => (
            <li key={`${account.platform}-${account.handle}`} className="creator-card__social">
              {account.platform} · {formatCompactNumber(account.followerCount)}
            </li>
          ))}
        </ul>
        <p className="creator-card__price">
          Từ <strong>{formatVnd(creator.priceFromVnd)}</strong>
          <span className="creator-card__arrow" aria-hidden="true">
            →
          </span>
        </p>
      </div>
    </Link>
  );
};
