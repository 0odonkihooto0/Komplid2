'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { ganttBase, type GanttTaskItem, type GanttTasksData } from './ganttTypes';

export function useGanttTasks(projectId: string, contractId: string, versionId: string | null) {
  const { data, isLoading, error } = useQuery<GanttTasksData>({
    queryKey: ['gantt-tasks', versionId],
    queryFn: async () => {
      const res = await fetch(
        `${ganttBase(projectId, contractId)}/versions/${versionId}/tasks`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки задач');
      return json.data;
    },
    enabled: !!versionId,
  });
  return { data: data ?? { tasks: [], dependencies: [] }, isLoading, error };
}

export function useCreateTask(projectId: string, contractId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      planStart: string;
      planEnd: string;
      parentId?: string;
      workItemId?: string;
      level?: number;
    }) => {
      const res = await fetch(
        `${ganttBase(projectId, contractId)}/versions/${versionId}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания задачи');
      return json.data as GanttTaskItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks', versionId] });
      toast({ title: 'Задача создана' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTask(projectId: string, contractId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: Partial<{
        name: string;
        planStart: string;
        planEnd: string;
        factStart: string | null;
        factEnd: string | null;
        progress: number;
        status: string;
        workItemId: string | null;
      }>;
    }) => {
      const res = await fetch(
        `${ganttBase(projectId, contractId)}/versions/${versionId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления задачи');
      return json.data as GanttTaskItem;
    },
    onMutate: async ({ taskId, data }) => {
      await qc.cancelQueries({ queryKey: ['gantt-tasks', versionId] });
      const prev = qc.getQueryData<GanttTasksData>(['gantt-tasks', versionId]);
      qc.setQueryData<GanttTasksData>(['gantt-tasks', versionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
        };
      });
      return { prev };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['gantt-tasks', versionId], ctx.prev);
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks', versionId] });
    },
  });
}

export function useUpdateTasksBulk(projectId: string, contractId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      updates: Array<{
        id: string;
        planStart?: string;
        planEnd?: string;
        progress?: number;
        sortOrder?: number;
      }>,
    ) => {
      const res = await fetch(
        `${ganttBase(projectId, contractId)}/versions/${versionId}/tasks/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка массового обновления');
      return json.data;
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['gantt-tasks', versionId] });
      const prev = qc.getQueryData<GanttTasksData>(['gantt-tasks', versionId]);
      qc.setQueryData<GanttTasksData>(['gantt-tasks', versionId], (old) => {
        if (!old) return old;
        const updateMap = new Map(updates.map((u) => [u.id, u]));
        return {
          ...old,
          tasks: old.tasks.map((t) => {
            const u = updateMap.get(t.id);
            if (!u) return t;
            return {
              ...t,
              ...(u.planStart && { planStart: u.planStart }),
              ...(u.planEnd && { planEnd: u.planEnd }),
              ...(u.progress !== undefined && { progress: u.progress }),
              ...(u.sortOrder !== undefined && { sortOrder: u.sortOrder }),
            };
          }),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['gantt-tasks', versionId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks', versionId] });
    },
  });
}

export function useDeleteTask(projectId: string, contractId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(
        `${ganttBase(projectId, contractId)}/versions/${versionId}/tasks/${taskId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Ошибка удаления задачи');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks', versionId] });
      toast({ title: 'Задача удалена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAutoFill(projectId: string, contractId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${ganttBase(projectId, contractId)}/versions/${versionId}/auto-fill`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка автозаполнения');
      return json.data as { created: number; message?: string };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks', versionId] });
      toast({ title: `Создано задач: ${result.created}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
