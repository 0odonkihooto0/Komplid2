'use client';

import { useQuery } from '@tanstack/react-query';

interface ContractStats {
  workRecordsCount: number;
  aosrCount: number;
  signedCount: number;
  materialsCount: number;
}

export function useContractStats(projectId: string, contractId: string) {
  const { data, isLoading } = useQuery<ContractStats>({
    queryKey: ['contract-stats', projectId, contractId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/contracts/${contractId}/stats`);
      const json = await res.json();
      return json.success ? json.data : { workRecordsCount: 0, aosrCount: 0, signedCount: 0, materialsCount: 0 };
    },
  });

  return { stats: data, isLoading };
}
