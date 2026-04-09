'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export function useDeleteWorkRecord(projectId: string, contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workRecordId: string) => {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/work-records/${workRecordId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
      return json.data;
    },
    onSuccess: () => {
      // Инвалидируем записи и материалы (т.к. при удалении записи откатываются списания)
      queryClient.invalidateQueries({ queryKey: ['work-records', contractId] });
      queryClient.invalidateQueries({ queryKey: ['materials', contractId] });
      toast({ title: 'Запись о работе удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}
