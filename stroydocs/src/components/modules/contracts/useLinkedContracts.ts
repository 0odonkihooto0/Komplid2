'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export function useLinkedContracts(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /** Привязываем дочерний контракт к текущему как родительский */
  const linkMutation = useMutation({
    mutationFn: async (targetContractId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${targetContractId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentContractId: contractId }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', projectId, contractId] });
      toast({ title: 'Договор привязан' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  /** Отвязываем дочерний контракт от текущего */
  const unlinkMutation = useMutation({
    mutationFn: async (targetContractId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${targetContractId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentContractId: null }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', projectId, contractId] });
      toast({ title: 'Договор отвязан' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return { linkMutation, unlinkMutation };
}
