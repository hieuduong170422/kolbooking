import { EmptyState } from '../../../shared/components/feedback/empty-state';
import { FavoriteButton } from '../../favorites/components/favorite-button';
import type { Creator } from '../types/creator-types';
import { CreatorCard } from './creator-card';

/** Lưới creator có nút lưu (BRD-006) — nút gắn ở đây để CreatorCard giữ nguyên tính thuần. */
export const CreatorList = ({ creators }: { creators: readonly Creator[] }) => {
  if (creators.length === 0) {
    return (
      <EmptyState
        title="Chưa tìm thấy creator phù hợp"
        description="Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
      />
    );
  }

  return (
    <div className="creator-grid">
      {creators.map((creator) => (
        <CreatorCard
          key={creator.id}
          creator={creator}
          action={<FavoriteButton creatorId={creator.id} />}
        />
      ))}
    </div>
  );
};
