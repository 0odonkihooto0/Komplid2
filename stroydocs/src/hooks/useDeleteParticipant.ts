'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export function useDeleteParticipant(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (participantId: string) => {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/participants/${participantId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', contractId] });
      toast({ title: 'Участник удалён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}
