'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { ganttBase, type GanttVersionItem } from './ganttTypes';

export { GanttVersionItem };

export function useGanttVersions(projectId: string, contractId: string) {
  const { data, isLoading, error } = useQuery<GanttVersionItem[]>({
    queryKey: ['gantt-versions', contractId],
    queryFn: async () => {
      const res = await fetch(`${ganttBase(projectId, contractId)}/versions`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки версий');
      return json.data;
    },
    enabled: !!projectId && !!contractId,
  });
  return { versions: data ?? [], isLoading, error };
}

export function useCreateVersion(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { name: string; isBaseline?: boolean; copyFromVersionId?: string }) => {
      const res = await fetch(`${ganttBase(projectId, contractId)}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания версии');
      return json.data as GanttVersionItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-versions', contractId] });
      toast({ title: 'Версия создана' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVersion(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      versionId,
      data,
    }: {
      versionId: string;
      data: { name?: string; isActive?: boolean; isBaseline?: boolean };
    }) => {
      const res = await fetch(`${ganttBase(projectId, contractId)}/versions/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления версии');
      return json.data as GanttVersionItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-versions', contractId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteVersion(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`${ganttBase(projectId, contractId)}/versions/${versionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Ошибка удаления версии');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-versions', contractId] });
      toast({ title: 'Версия удалена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
