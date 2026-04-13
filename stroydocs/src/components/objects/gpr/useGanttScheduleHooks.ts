'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { GanttTaskItem, GanttTasksData, GanttExecDocRef } from '@/components/modules/gantt/ganttTypes';

function gprBase(objectId: string, versionId: string) {
  return `/api/projects/${objectId}/gantt-versions/${versionId}`;
}

// ── Задачи ────────────────────────────────────────────────────────────────────

export function useGanttTasksGPR(objectId: string, versionId: string | null) {
  const { data, isLoading, error } = useQuery<GanttTasksData>({
    queryKey: ['gantt-tasks-gpr', versionId],
    queryFn: async () => {
      const res = await fetch(`${gprBase(objectId, versionId!)}/tasks`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки задач ГПР');
      return json.data;
    },
    enabled: !!versionId,
  });
  return { data: data ?? { tasks: [], dependencies: [] }, isLoading, error };
}

export function useCreateTaskGPR(objectId: string, versionId: string) {
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
      const res = await fetch(`${gprBase(objectId, versionId)}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания задачи');
      return json.data as GanttTaskItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      toast({ title: 'Задача создана' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

/** Контракты объекта для выбора в карточке задачи */
export function useObjectContracts(objectId: string) {
  const { data, isLoading } = useQuery<{ id: string; number: string; name: string }[]>({
    queryKey: ['object-contracts', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/contracts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки контрактов');
      return (json.data as Array<{ id: string; number: string; name: string }>).map((c) => ({
        id: c.id,
        number: c.number,
        name: c.name,
      }));
    },
    enabled: !!objectId,
  });
  return { contracts: data ?? [], isLoading };
}

export function useUpdateTaskGPR(objectId: string, versionId: string) {
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
        parentId: string | null;
        sortOrder: number;
        // Расширенные поля ГПР
        volume: number | null;
        volumeUnit: string | null;
        amount: number | null;
        amountVat: number | null;
        weight: number;
        manHours: number | null;
        machineHours: number | null;
        deadline: string | null;
        comment: string | null;
        isCritical: boolean;
        isMilestone: boolean;
        costType: string | null;
        workType: string | null;
        basis: string | null;
        materialDistribution: string;
        calcType: string | null;
        taskContractId: string | null;
        attachmentS3Keys: string[];
      }>;
    }) => {
      const res = await fetch(`${gprBase(objectId, versionId)}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления задачи');
      return json.data as GanttTaskItem;
    },
    onMutate: async ({ taskId, data }) => {
      await qc.cancelQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      const prev = qc.getQueryData<GanttTasksData>(['gantt-tasks-gpr', versionId]);
      qc.setQueryData<GanttTasksData>(['gantt-tasks-gpr', versionId], (old) => {
        if (!old) return old;
        return { ...old, tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)) };
      });
      return { prev };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['gantt-tasks-gpr', versionId], ctx.prev);
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
    },
  });
}

export function useUpdateTasksBulkGPR(objectId: string, versionId: string) {
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
      const res = await fetch(`${gprBase(objectId, versionId)}/tasks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка массового обновления');
      return json.data;
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      const prev = qc.getQueryData<GanttTasksData>(['gantt-tasks-gpr', versionId]);
      qc.setQueryData<GanttTasksData>(['gantt-tasks-gpr', versionId], (old) => {
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
      if (ctx?.prev) qc.setQueryData(['gantt-tasks-gpr', versionId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
    },
  });
}

export function useDeleteTaskGPR(objectId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`${gprBase(objectId, versionId)}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Ошибка удаления задачи');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      toast({ title: 'Задача удалена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAutoFillFromWorkItems(objectId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/gantt-versions/${versionId}/auto-fill-from-work-items`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка автозаполнения');
      return json.data as { created: number; message?: string };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      toast({ title: `Создано задач: ${result.created}` });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

// ── Исполнительные документы ──────────────────────────────────────────────────

export function useGanttExecDocs(
  objectId: string,
  versionId: string,
  taskId: string | null,
) {
  const { data, isLoading } = useQuery<GanttExecDocRef[]>({
    queryKey: ['gantt-exec-docs', taskId],
    queryFn: async () => {
      const res = await fetch(
        `${gprBase(objectId, versionId)}/tasks/${taskId}/exec-docs`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки ИД');
      return json.data;
    },
    enabled: !!taskId,
  });
  return { execDocs: data ?? [], isLoading };
}

export function useLinkExecDoc(objectId: string, versionId: string, taskId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (execDocId: string) => {
      const res = await fetch(
        `${gprBase(objectId, versionId)}/tasks/${taskId}/exec-docs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ execDocId }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка привязки документа');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-exec-docs', taskId] });
      qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      toast({ title: 'Документ привязан' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUnlinkExecDoc(objectId: string, versionId: string, taskId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (execDocId: string) => {
      const res = await fetch(
        `${gprBase(objectId, versionId)}/tasks/${taskId}/exec-docs?execDocId=${encodeURIComponent(execDocId)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Ошибка отвязки документа');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-exec-docs', taskId] });
      qc.invalidateQueries({ queryKey: ['gantt-tasks-gpr', versionId] });
      toast({ title: 'Документ отвязан' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
