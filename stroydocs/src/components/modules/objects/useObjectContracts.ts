'use client';

import { useQuery } from '@tanstack/react-query';

export interface ObjectContract {
  id: string;
  number: string;
  name: string;
}

export function useObjectContracts(objectId: string) {
  const { data: contracts = [], isLoading } = useQuery<ObjectContract[]>({
    queryKey: ['object-contracts', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/contracts`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data as ObjectContract[];
    },
  });

  return { contracts, isLoading };
}
