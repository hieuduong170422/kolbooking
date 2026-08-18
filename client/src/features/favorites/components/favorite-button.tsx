import { useContext, type MouseEvent } from 'react';
import { IconHeart, IconHeartFilled } from '../../../shared/components/icons';
import { AuthContext } from '../../auth/store/auth-context';
import { useFavorites, useToggleFavorite } from '../hooks/use-favorites';

/** Phần bấm được — tách riêng để hook chỉ chạy khi chắc chắn có brand đăng nhập. */
const ToggleButton = ({ creatorId }: { creatorId: string }) => {
  const { data: favorites } = useFavorites();
  const toggle = useToggleFavorite();

  const saved = favorites?.some((creator) => creator.id === creatorId) ?? false;

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    // Card bao ngoài là <Link> — chặn điều hướng khi bấm nút lưu.
    event.preventDefault();
    event.stopPropagation();
    toggle.mutate({ creatorId, saved });
  };

  return (
    <button
      type="button"
      className={`favorite-button${saved ? ' favorite-button--on' : ''}`}
      onClick={handleClick}
      disabled={toggle.isPending}
      aria-pressed={saved}
      aria-label={saved ? 'Bỏ lưu creator' : 'Lưu creator'}
      title={saved ? 'Bỏ lưu' : 'Lưu creator'}
    >
      {saved ? <IconHeartFilled /> : <IconHeart />}
    </button>
  );
};

/**
 * Nút lưu creator (BRD-006) — chỉ hiện với tài khoản brand.
 * Đọc context trực tiếp thay vì useAuth: đây là chrome tuỳ chọn, nơi nào
 * chưa có AuthProvider thì lặng lẽ không hiển thị chứ không làm vỡ cây render.
 */
export const FavoriteButton = ({ creatorId }: { creatorId: string }) => {
  const auth = useContext(AuthContext);
  if (auth?.user?.role !== 'brand') return null;
  return <ToggleButton creatorId={creatorId} />;
};
