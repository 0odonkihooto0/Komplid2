import { useQuery } from '@tanstack/react-query';

// Хук для получения количества входящих документов, требующих действия текущего пользователя
// Переиспользуется в SidebarNav (badge)
export function useInboxCount(): number {
  const { data } = useQuery<{ count: number }>({
    queryKey: ['inbox-count'],
    queryFn: async () => {
      const res = await fetch('/api/inbox/count');
      const json = await res.json();
      return json.success ? json.data : { count: 0 };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  return data?.count ?? 0;
}
