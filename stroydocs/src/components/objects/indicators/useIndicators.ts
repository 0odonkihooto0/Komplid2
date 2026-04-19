'use client';

import { useQuery } from '@tanstack/react-query';

export interface IndicatorsData {
  totalContracts: number;
  totalWorkRecords: number;
  totalDocs: number;
  signedDocs: number;
  idReadinessPercent: number;
  totalKs2Amount: number;
}

export function useIndicators(projectId: string) {
  const { data, isLoading } = useQuery<IndicatorsData>({
    queryKey: ['indicators', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/indicators`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return { indicators: data, isLoading };
}
