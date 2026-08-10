import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/store/use-auth';
import { addFavorite, fetchFavorites, removeFavorite } from '../api/favorites-api';

export const favoritesQueryKey = ['favorites'] as const;

/**
 * Danh sách creator đã lưu — chỉ gọi API khi user là brand (BRD-006);
 * creator/guest không có endpoint này nên tránh gọi rồi nhận 403.
 */
export const useFavorites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: favoritesQueryKey,
    queryFn: fetchFavorites,
    enabled: user?.role === 'brand',
    retry: false,
  });
};

/** Bật/tắt lưu creator — invalidate danh sách sau mỗi thay đổi. */
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ creatorId, saved }: { creatorId: string; saved: boolean }) =>
      saved ? removeFavorite(creatorId) : addFavorite(creatorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: favoritesQueryKey });
    },
  });
};
