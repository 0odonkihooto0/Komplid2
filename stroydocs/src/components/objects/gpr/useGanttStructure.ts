'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface GanttStageItem {
  id: string;
  name: string;
  order: number;
  isCurrent: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  _count: { versions: number };
}

export interface GanttVersionSummary {
  id: string;
  name: string;
  description: string | null;
  stageId: string | null;
  projectId: string | null;
  isDirective: boolean;
  isActive: boolean;
  isBaseline: boolean;
  stage: { id: string; name: string } | null;
  taskCount: number;
  planStart: string | null;
  planEnd: string | null;
  totalAmount: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// ── Стадии ────────────────────────────────────────────────────────────────────

export function useGanttStages(objectId: string) {
  const { data, isLoading, error } = useQuery<GanttStageItem[]>({
    queryKey: ['gantt-stages', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/gantt-stages`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки стадий');
      return json.data;
    },
    enabled: !!objectId,
  });
  return { stages: data ?? [], isLoading, error };
}

export function useCreateStage(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания стадии');
      return json.data as GanttStageItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-stages', objectId] });
      toast({ title: 'Стадия создана' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

// ── Версии ────────────────────────────────────────────────────────────────────

export function useGanttVersionsByProject(objectId: string, stageId?: string | null) {
  const { data, isLoading, error } = useQuery<GanttVersionSummary[]>({
    queryKey: ['gantt-versions-project', objectId, stageId ?? null],
    queryFn: async () => {
      const url = new URL(`/api/projects/${objectId}/gantt-versions`, window.location.origin);
      if (stageId) url.searchParams.set('stageId', stageId);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки версий');
      return json.data;
    },
    enabled: !!objectId,
  });
  return { versions: data ?? [], isLoading, error };
}

export function useCreateVersion(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { name: string; stageId?: string }) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания версии');
      return json.data as GanttVersionSummary;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-versions-project', objectId] });
      toast({ title: 'Версия ГПР создана' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useDeleteVersion(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-versions/${versionId}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Ошибка удаления версии');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-versions-project', objectId] });
      toast({ title: 'Версия удалена' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useCopyVersion(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-versions/${versionId}/copy`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка копирования версии');
      return json.data as GanttVersionSummary;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-versions-project', objectId] });
      toast({ title: 'Версия скопирована' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useSetDirective(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-versions/${versionId}/set-directive`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Ошибка установки директивного плана');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-versions-project', objectId] });
      toast({ title: 'Директивный план установлен' });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

// ── Управление стадиями ───────────────────────────────────────────────────────

export function useUpdateStage(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      stageId,
      ...data
    }: { stageId: string; name?: string; order?: number; isCurrent?: boolean }) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления стадии');
      return json.data as GanttStageItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-stages', objectId] });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useDeleteStage(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (stageId: string) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-stages/${stageId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления стадии');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-stages', objectId] });
      toast({ title: 'Стадия удалена' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useImportFromEstimate(objectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ versionId, estimateVersionId }: { versionId: string; estimateVersionId: string }) => {
      const res = await fetch(`/api/projects/${objectId}/gantt-versions/${versionId}/import-from-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateVersionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка импорта из сметы');
      return json.data as { imported: boolean; taskCount: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['gantt-versions-project', objectId] });
      toast({ title: `Импортировано ${data.taskCount} задач из сметы` });
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}
