'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { ganttBase, type GanttDependencyItem } from './ganttTypes';

export function useCreateDependency(projectId: string, contractId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: {
      predecessorId: string;
      successorId: string;
      type?: 'FS' | 'SS' | 'FF' | 'SF';
      lagDays?: number;
    }) => {
      const res = await fetch(
        `${ganttBase(projectId, contractId)}/versions/${versionId}/dependencies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания зависимости');
      return json.data as GanttDependencyItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks', versionId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteDependency(projectId: string, contractId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (depId: string) => {
      const res = await fetch(
        `${ganttBase(projectId, contractId)}/versions/${versionId}/dependencies?depId=${depId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Ошибка удаления зависимости');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks', versionId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
