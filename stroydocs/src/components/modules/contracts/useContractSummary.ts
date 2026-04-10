'use client';

import { useQuery } from '@tanstack/react-query';

interface ContractSummary {
  count: number;
  totalAmount: number;
  plannedTotal: number;
  factTotal: number;
}

export function useContractSummary(projectId: string, contractId: string) {
  const { data, isLoading } = useQuery<ContractSummary>({
    queryKey: ['contract-summary', projectId, contractId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}/summary`);
      if (!res.ok) throw new Error('Ошибка загрузки сводки');
      const json = await res.json();
      return json.data;
    },
  });

  return { summary: data, isLoading };
}
