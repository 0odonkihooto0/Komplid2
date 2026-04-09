'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export type ChartType = 'bar' | 'pie';

export interface SkAnalyticsData {
  summary: {
    totalDefects: number;
    openDefects: number;
    overdueDefects: number;
    totalInspections: number;
  };
  byCategory: { category: string | null; count: number }[];
  byStatus: { status: string; count: number }[];
  byAuthor: { authorId: string; name: string; count: number }[];
  byAssignee: { assigneeId: string | null; name: string; count: number }[];
}

export function useSkAnalytics(projectId: string) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery<SkAnalyticsData>({
    queryKey: ['sk-analytics', projectId, dateFrom, dateTo],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (dateFrom) p.set('dateFrom', dateFrom);
      if (dateTo) p.set('dateTo', dateTo);
      const res = await fetch(`/api/projects/${projectId}/sk-analytics?${p}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as SkAnalyticsData;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading, dateFrom, setDateFrom, dateTo, setDateTo };
}
