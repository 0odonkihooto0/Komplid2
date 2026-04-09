import { useQuery } from '@tanstack/react-query';

// Общий хук для получения количества непрочитанных уведомлений
// Переиспользуется в Header (NotificationsDropdown) и Sidebar
export function useUnreadCount(): number {
  const { data } = useQuery<{ items: unknown[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      return json.success ? json.data : { items: [], unreadCount: 0 };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  return data?.unreadCount ?? 0;
}
