import { Link } from 'react-router';
import { formatCompactNumber, formatVnd } from '../../../shared/utils/format';
import { CREATOR_TYPE_LABELS, type Creator } from '../types/creator-types';

const creatorInitials = (displayName: string): string =>
  displayName
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

export const CreatorCard = ({ creator }: { creator: Creator }) => (
  <Link to={`/creators/${creator.id}`} className="creator-card">
    <div className="creator-card__avatar" aria-hidden="true">
      {creatorInitials(creator.displayName)}
    </div>
    <div className="creator-card__body">
      <div className="creator-card__heading">
        <h3 className="creator-card__name">{creator.displayName}</h3>
        <span className="badge">{CREATOR_TYPE_LABELS[creator.creatorType]}</span>
      </div>
      <p className="creator-card__meta">
        {creator.city} · ⭐ {creator.rating.toFixed(1)} · {creator.completedBookings} booking
      </p>
      <p className="creator-card__bio">{creator.bio}</p>
      <ul className="creator-card__socials">
        {creator.socialAccounts.map((account) => (
          <li key={`${account.platform}-${account.handle}`} className="creator-card__social">
            {account.platform} · {formatCompactNumber(account.followerCount)}
          </li>
        ))}
      </ul>
      <p className="creator-card__price">
        Từ <strong>{formatVnd(creator.priceFromVnd)}</strong>
      </p>
    </div>
  </Link>
);
