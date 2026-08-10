import { useQuery } from '@tanstack/react-query';
import { fetchPackagesByCreator } from '../api/packages-api';

/** Package published của một creator — hiển thị ở creator detail (SRCH-005). */
export const usePackagesByCreator = (creatorId: string | undefined) =>
  useQuery({
    queryKey: ['packages', 'by-creator', creatorId] as const,
    queryFn: () => fetchPackagesByCreator(creatorId as string),
    enabled: creatorId !== undefined,
    retry: false,
  });
