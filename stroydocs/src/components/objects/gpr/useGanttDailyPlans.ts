'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface GanttDailyPlanItem {
  id: string;
  planDate: string;
  taskId: string;
  task: { id: string; name: string };
  workers: number | null;
  machinery: string | null;
  volume: number | null;
  unit: string | null;
  notes: string | null;
  createdBy: { firstName: string; lastName: string };
  createdAt: string;
}

function dailyBase(objectId: string, versionId: string) {
  return `/api/projects/${objectId}/gantt-versions/${versionId}/daily`;
}

// ── Получить суточный план ─────────────────────────────────────────────────────

export function useGanttDailyPlans(
  objectId: string,
  versionId: string | null,
  date: string | null,
) {
  const { data, isLoading, error } = useQuery<GanttDailyPlanItem[]>({
    queryKey: ['gantt-daily-plans', versionId, date],
    queryFn: async () => {
      const url = new URL(dailyBase(objectId, versionId!), window.location.origin);
      if (date) url.searchParams.set('date', date);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки суточного плана');
      return json.data;
    },
    enabled: !!versionId && !!date,
  });
  return { plans: data ?? [], isLoading, error };
}

// ── Создать запись ─────────────────────────────────────────────────────────────

export interface CreateDailyPlanInput {
  taskId: string;
  planDate: string;
  workers?: number;
  machinery?: string;
  volume?: number;
  unit?: string;
  notes?: string;
}

export function useCreateDailyPlan(objectId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: CreateDailyPlanInput) => {
      const res = await fetch(dailyBase(objectId, versionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания записи');
      return json.data as GanttDailyPlanItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-daily-plans', versionId] });
      toast({ title: 'Запись добавлена' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

// ── Обновить запись ────────────────────────────────────────────────────────────

export interface UpdateDailyPlanInput {
  dailyId: string;
  workers?: number | null;
  machinery?: string | null;
  volume?: number | null;
  unit?: string | null;
  notes?: string | null;
}

export function useUpdateDailyPlan(objectId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ dailyId, ...data }: UpdateDailyPlanInput) => {
      const res = await fetch(`${dailyBase(objectId, versionId)}/${dailyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления записи');
      return json.data as GanttDailyPlanItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-daily-plans', versionId] });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

// ── Удалить запись ─────────────────────────────────────────────────────────────

export function useDeleteDailyPlan(objectId: string, versionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (dailyId: string) => {
      const res = await fetch(`${dailyBase(objectId, versionId)}/${dailyId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка удаления записи');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gantt-daily-plans', versionId] });
      toast({ title: 'Запись удалена' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}
