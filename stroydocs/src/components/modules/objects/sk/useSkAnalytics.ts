'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export type ChartType = 'bar' | 'pie';
export type PeriodOption = 'all' | 'week' | 'month' | 'quarter';

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
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data, isLoading } = useQuery<SkAnalyticsData>({
    queryKey: ['sk-analytics', projectId, dateFrom, dateTo, period, overdueOnly],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (period !== 'all') {
        p.set('period', period);
      } else {
        if (dateFrom) p.set('dateFrom', dateFrom);
        if (dateTo) p.set('dateTo', dateTo);
      }
      if (overdueOnly) p.set('overdueOnly', 'true');
      const res = await fetch(`/api/projects/${projectId}/sk-analytics?${p}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as SkAnalyticsData;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    data, isLoading,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    period, setPeriod,
    overdueOnly, setOverdueOnly,
  };
}
