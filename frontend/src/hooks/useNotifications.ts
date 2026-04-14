import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Notification } from '@/types/database';
import { apiClient } from '@/lib/api-client';

export function useNotifications(userId?: number) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      return apiClient.get<Notification[]>(`/notifications?user_id=${userId}`);
    },
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      return apiClient.put(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useUnreadCount(userId?: number) {
  return useQuery({
    queryKey: ['notifications-unread', userId],
    queryFn: async () => {
      if (!userId) return 0;
      return apiClient.get<number>(`/notifications/unread-count?user_id=${userId}`);
    },
    enabled: !!userId,
  });
}
