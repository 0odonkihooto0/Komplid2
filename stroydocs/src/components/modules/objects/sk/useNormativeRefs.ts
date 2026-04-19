'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

// Добавить нормативную ссылку к дефекту
export function useAddNormativeRef(objectId: string, defectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { reference: string; description?: string }) => {
      const res = await fetch(
        `/api/projects/${objectId}/defects/${defectId}/normative-refs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка добавления ссылки');
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['defect', objectId, defectId] });
      toast({ title: 'Ссылка добавлена' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

// Удалить нормативную ссылку дефекта
export function useDeleteNormativeRef(objectId: string, defectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (refId: string) => {
      const res = await fetch(
        `/api/projects/${objectId}/defects/${defectId}/normative-refs/${refId}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления ссылки');
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['defect', objectId, defectId] });
      toast({ title: 'Ссылка удалена' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}
