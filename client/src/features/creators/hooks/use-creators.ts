import { useQuery } from '@tanstack/react-query';
import { fetchCreators } from '../api/creators-api';
import type { CreatorListFilter } from '../types/creator-types';

export const creatorsQueryKey = (filter: CreatorListFilter) => ['creators', filter] as const;

export const useCreators = (filter: CreatorListFilter) =>
  useQuery({
    queryKey: creatorsQueryKey(filter),
    queryFn: () => fetchCreators(filter),
    placeholderData: (previous) => previous,
  });
