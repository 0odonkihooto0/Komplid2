'use client';

import { useQuery } from '@tanstack/react-query';

export interface WidgetData {
  totalAmount: number;
  mastered: number;
  completionPercent: number;
  planStartDate: string | null;
  planEndDate: string | null;
  delta: number;
  isAhead: boolean;
}

export interface PassportWidgetData {
  pir: WidgetData;
  smr: WidgetData;
}

export function usePassportWidgets(projectId: string) {
  return useQuery<PassportWidgetData>({
    queryKey: ['passport-widgets', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/passport/widgets`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as PassportWidgetData;
    },
    staleTime: 5 * 60 * 1000,
  });
}
