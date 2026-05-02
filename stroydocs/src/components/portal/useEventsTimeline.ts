// Хук для загрузки хроники событий публичного портала
import { useQuery } from '@tanstack/react-query';

export interface TimelineEvent {
  id: string;
  type: string;
  date: string;
  title: string;
  description?: string;
}

interface TimelineData {
  events: TimelineEvent[];
}

export function useEventsTimeline(token: string) {
  return useQuery({
    queryKey: ['portal-timeline', token],
    queryFn: async (): Promise<TimelineData> => {
      const res = await fetch(`/api/portal/${token}/timeline`);
      if (!res.ok) throw new Error('Ошибка загрузки событий');
      const json = await res.json() as { success: boolean; data: TimelineData };
      return json.data;
    },
  });
}
