'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface EstimateVersion {
  id: string;
  name: string;
  versionType: string;
  isBaseline: boolean;
  isActual: boolean;
  totalAmount: number | null;
  createdAt: string;
}

export interface LinkedEstimateItem {
  id: string; // EstimateContractVersion.id (используется для delete)
  order: number;
  estimateVersion: EstimateVersion;
}

export function useLocalEstimates(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['linked-estimates', projectId, contractId];

  const { data: estimates = [], isLoading, isError } = useQuery<LinkedEstimateItem[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/linked-estimates`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  /** Привязать версию сметы к договору */
  const linkMutation = useMutation({
    mutationFn: async (estimateVersionId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/linked-estimates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimateVersionId }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Смета привязана' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  /** Отвязать EstimateContractVersion по её id */
  const unlinkMutation = useMutation({
    mutationFn: async (estimateContractVersionId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/linked-estimates`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: estimateContractVersionId }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Смета отвязана' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { estimates, isLoading, isError, linkMutation, unlinkMutation };
}
