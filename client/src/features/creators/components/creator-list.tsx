import { EmptyState } from '../../../shared/components/feedback/empty-state';
import type { Creator } from '../types/creator-types';
import { CreatorCard } from './creator-card';

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
        <CreatorCard key={creator.id} creator={creator} />
      ))}
    </div>
  );
};
