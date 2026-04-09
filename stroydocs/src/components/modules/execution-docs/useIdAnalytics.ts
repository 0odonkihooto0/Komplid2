import { useQuery } from '@tanstack/react-query';

// Типы данных аналитики ИД

export interface GprReadinessItem {
  stageName: string;
  totalTasks: number;
  signedDocs: number;
  readinessPercent: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface AuthorDocs {
  userName: string;
  signed: number;
  inReview: number;
  draft: number;
  rejected: number;
}

export interface AuthorComments {
  userName: string;
  count: number;
}

export interface IdAnalyticsData {
  gprReadiness: GprReadinessItem[];
  docsByStatus: StatusCount[];
  docsByAuthor: AuthorDocs[];
  commentsByStatus: StatusCount[];
  commentsByAuthor: AuthorComments[];
}

// Хук загрузки аналитики ИД по объекту
export function useIdAnalytics(objectId: string) {
  return useQuery<IdAnalyticsData>({
    queryKey: ['id-analytics', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/id-analytics`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки аналитики ИД');
      return json.data as IdAnalyticsData;
    },
    enabled: !!objectId,
    staleTime: 5 * 60 * 1000,
  });
}
