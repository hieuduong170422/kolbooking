import { useQuery } from '@tanstack/react-query';
import { fetchCreatorById } from '../api/creators-api';

export const useCreator = (id: string | undefined) =>
  useQuery({
    queryKey: ['creators', 'detail', id],
    queryFn: () => fetchCreatorById(id as string),
    enabled: Boolean(id),
  });
