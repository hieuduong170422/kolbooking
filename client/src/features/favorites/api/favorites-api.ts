import { apiDelete, apiGet, apiPost } from '../../../shared/api/http-client';
import type { Creator } from '../../creators/types/creator-types';

/** Creator brand đã lưu (BRD-006) — server chỉ trả creator còn verified. */
export const fetchFavorites = async (): Promise<readonly Creator[]> => {
  const response = await apiGet<readonly Creator[]>('/favorites');
  return response.data;
};

export const addFavorite = async (creatorId: string): Promise<void> => {
  await apiPost(`/favorites/${creatorId}`);
};

export const removeFavorite = async (creatorId: string): Promise<void> => {
  await apiDelete(`/favorites/${creatorId}`);
};
