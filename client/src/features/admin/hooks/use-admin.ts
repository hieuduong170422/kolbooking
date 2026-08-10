import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAuditEntries, fetchUsers, lockUser, unlockUser } from '../api/admin-api';
import type { AuditListFilter, UserListFilter } from '../types/admin-types';

export const useUsers = (filter: UserListFilter) =>
  useQuery({
    queryKey: ['admin', 'users', filter] as const,
    queryFn: () => fetchUsers(filter),
  });

/** Khóa/mở khóa tài khoản — invalidate cả danh sách user lẫn audit log. */
export const useUserActions = () => {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
  };

  const lock = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      lockUser(userId, reason),
    onSuccess: invalidate,
  });
  const unlock = useMutation({ mutationFn: unlockUser, onSuccess: invalidate });

  return { lock, unlock };
};

export const useAuditEntries = (filter: AuditListFilter) =>
  useQuery({
    queryKey: ['admin', 'audit', filter] as const,
    queryFn: () => fetchAuditEntries(filter),
  });
