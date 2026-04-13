'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// Задача с информацией о делегировании
export interface DelegatedTaskItem {
  id: string;
  name: string;
  level: number;
  sortOrder: number;
  delegatedToVersionId: string | null;
  delegatedToVersionName: string | null;
  delegatedFromOrg: string | null;
  delegatedToOrg: string | null;
}

export function useGanttDelegationView(objectId: string, versionId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<DelegatedTaskItem[]>({
    queryKey: ['gantt-delegated-tasks', versionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/gantt-versions/${versionId!}/delegated-tasks`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки делегированных задач');
      return json.data ?? [];
    },
    enabled: !!versionId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/gantt-versions/${versionId!}/sync-delegation`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка синхронизации делегирования');
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-delegated-tasks', versionId] });
      qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      toast({ title: 'Данные готовности перенесены' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  return {
    tasks: data ?? [],
    isLoading,
    syncDelegation: () => syncMutation.mutate(),
    isSyncing: syncMutation.isPending,
  };
}
