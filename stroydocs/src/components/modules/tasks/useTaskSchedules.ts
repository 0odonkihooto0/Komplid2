'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export interface TaskScheduleItem {
  id: string;
  templateId: string;
  repeatType: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  interval: number;
  weekDays: number[];
  monthDays: number[];
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createSubTasks: boolean;
  lastRunAt: string | null;
  createdAt: string;
  template: { id: string; name: string };
}

export function useTaskSchedules(templateId: string | null) {
  const { data, isLoading } = useQuery<TaskScheduleItem[]>({
    queryKey: ['task-schedules', templateId],
    queryFn: async () => {
      const url = templateId
        ? `/api/task-schedules?templateId=${templateId}`
        : '/api/task-schedules';
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskScheduleItem[];
    },
    enabled: !!templateId,
    staleTime: 30_000,
  });

  return { schedules: data ?? [], isLoading };
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      templateId: string;
      repeatType: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
      interval: number;
      weekDays?: number[];
      monthDays?: number[];
      startDate: string;
      endDate?: string | null;
      isActive?: boolean;
      createSubTasks?: boolean;
    }) => {
      const res = await fetch('/api/task-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskScheduleItem;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['task-schedules', data.templateId] });
      void queryClient.invalidateQueries({ queryKey: ['task-template', data.templateId] });
      void queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast({ title: 'Расписание добавлено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId, ...body }: {
      id: string;
      templateId: string;
      repeatType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
      interval?: number;
      weekDays?: number[];
      monthDays?: number[];
      startDate?: string;
      endDate?: string | null;
      isActive?: boolean;
      createSubTasks?: boolean;
    }) => {
      const res = await fetch(`/api/task-schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return { ...json.data, templateId } as TaskScheduleItem;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['task-schedules', data.templateId] });
      void queryClient.invalidateQueries({ queryKey: ['task-template', data.templateId] });
      void queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const res = await fetch(`/api/task-schedules/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return { id, templateId };
    },
    onSuccess: ({ templateId }) => {
      void queryClient.invalidateQueries({ queryKey: ['task-schedules', templateId] });
      void queryClient.invalidateQueries({ queryKey: ['task-template', templateId] });
      void queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast({ title: 'Расписание удалено' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
