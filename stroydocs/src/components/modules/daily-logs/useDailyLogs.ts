'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export interface DailyLogItem {
  id: string;
  date: string; // ISO date string (date only)
  weather: string | null;
  temperature: number | null;
  workersCount: number | null;
  notes: string | null;
  contractId: string;
  authorId: string;
  author: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

function logsBase(projectId: string, contractId: string) {
  return `/api/objects/${projectId}/contracts/${contractId}/daily-logs`;
}

export function useDailyLogs(projectId: string, contractId: string) {
  return useQuery<DailyLogItem[]>({
    queryKey: ['daily-logs', contractId],
    queryFn: async () => {
      const res = await fetch(logsBase(projectId, contractId));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!projectId && !!contractId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateDailyLog(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      date: string;
      weather?: string;
      temperature?: number;
      workersCount?: number;
      notes?: string;
    }) => {
      const res = await fetch(logsBase(projectId, contractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка создания записи');
      return json.data as DailyLogItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-logs', contractId] });
      toast({ title: 'Запись добавлена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateDailyLog(projectId: string, contractId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ logId, ...data }: {
      logId: string;
      weather?: string;
      temperature?: number | null;
      workersCount?: number | null;
      notes?: string;
    }) => {
      const res = await fetch(`${logsBase(projectId, contractId)}/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка обновления записи');
      return json.data as DailyLogItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-logs', contractId] });
      toast({ title: 'Запись обновлена' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
