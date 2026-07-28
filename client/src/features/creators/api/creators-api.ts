import { apiGet } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import type { Creator, CreatorListFilter } from '../types/creator-types';

export const fetchCreators = (
  filter: CreatorListFilter,
): Promise<ApiSuccessBody<readonly Creator[]>> =>
  apiGet<readonly Creator[]>('/creators', {
    search: filter.search,
    city: filter.city,
    creatorType: filter.creatorType,
    platform: filter.platform,
    sort: filter.sort,
    page: filter.page,
    limit: filter.limit,
  });

export const fetchCreatorById = async (id: string): Promise<Creator> => {
  const response = await apiGet<Creator>(`/creators/${id}`);
  return response.data;
};
