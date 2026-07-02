import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { User, UserListResponse } from '@/types/user';

export const userKeys = {
  all:     () => ['users'],
  lists:   () => [...userKeys.all(), 'list'],
  list:    (filters: Record<string, unknown>) => [...userKeys.lists(), filters],
  details: () => [...userKeys.all(), 'detail'],
  detail:  (id: string) => [...userKeys.details(), id],
};

/**
 * Fetch all users with search, role, status, page, and limit filters.
 */
export function useUsers(filters: Record<string, unknown> = {}) {
  return useQuery<UserListResponse>({
    queryKey: userKeys.list(filters),
    queryFn:  async () => {
      const { data } = await apiClient.get('/users', { params: filters });
      return data;
    },
  });
}

/**
 * Fetch a single user by ID.
 */
export function useUser(id: string) {
  return useQuery<{ success: boolean; data: User }>({
    queryKey: userKeys.detail(id),
    queryFn:  async () => {
      const { data } = await apiClient.get(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Update user status with optimistic cache updates.
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      remarks,
    }: {
      id: string;
      status: string;
      remarks?: string;
    }) => {
      const { data } = await apiClient.patch(`/users/${id}/status`, { status, remarks });
      return data;
    },
    // Optimistic UI updates
    onMutate: async (newStatusData) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: userKeys.all() });

      // Snapshot the current cache value
      const previousUsersQueries = queryClient.getQueriesData({ queryKey: userKeys.lists() });

      // Optimistically update all cached user list queries
      queryClient.setQueriesData<UserListResponse>({ queryKey: userKeys.lists() }, (old: UserListResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          users: old.users.map((user: User) =>
            user.id === newStatusData.id
              ? {
                  ...user,
                  status: newStatusData.status as User['status'],
                }
              : user
          ),
        };
      });

      return { previousUsersQueries };
    },
    // Rollback cache if mutation fails
    onError: (err, newStatusData, context) => {
      const typedContext = context as { previousUsersQueries: [QueryKey, unknown][] } | undefined;
      if (typedContext?.previousUsersQueries) {
        typedContext.previousUsersQueries.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
    },
    // Always trigger query refetch after success or failure
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all() });
    },
  });
}
