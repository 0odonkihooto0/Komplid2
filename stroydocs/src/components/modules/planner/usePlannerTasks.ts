'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export interface PlannerTask {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline: string | null;
  projectId: string;
  parentTaskId: string | null;
  order: number;
  level: number;
  versionId: string | null;
  assigneeId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; firstName: string; lastName: string } | null;
  _count: { childTasks: number };
}

export interface CreatePlannerTaskInput {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline?: string;
  assigneeId?: string;
  parentTaskId?: string;
  versionId?: string;
}

export interface UpdatePlannerTaskInput {
  taskId: string;
  title?: string;
  description?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline?: string | null;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  versionId?: string | null;
  order?: number;
}

export interface ReorderPlannerTaskInput {
  taskId: string;
  newParentTaskId: string | null;
  newOrder: number;
}

export function usePlannerTasks(projectId: string, versionId?: string | null) {
  const { data: tasks = [], isLoading, error } = useQuery<PlannerTask[]>({
    queryKey: ['planner-tasks', projectId, versionId ?? 'all'],
    queryFn: async () => {
      const url = versionId
        ? `/api/objects/${projectId}/planner-tasks?versionId=${versionId}`
        : `/api/objects/${projectId}/planner-tasks`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return { tasks, isLoading, error };
}

export function useCreatePlannerTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlannerTaskInput) => {
      const res = await fetch(`/api/objects/${projectId}/planner-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as PlannerTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks', projectId] });
      toast({ title: 'Задача создана' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });
}

export function useUpdatePlannerTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, ...data }: UpdatePlannerTaskInput) => {
      const res = await fetch(`/api/objects/${projectId}/planner-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as PlannerTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks', projectId] });
      toast({ title: 'Задача обновлена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });
}

export function useDeletePlannerTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/objects/${projectId}/planner-tasks/${taskId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks', projectId] });
      toast({ title: 'Задача удалена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });
}

export function useReorderPlannerTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, newParentTaskId, newOrder }: ReorderPlannerTaskInput) => {
      const res = await fetch(`/api/objects/${projectId}/planner-tasks/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, newParentTaskId, newOrder }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      // Тихая инвалидация без тоста — перестановка выполняется drag-and-drop
      queryClient.invalidateQueries({ queryKey: ['planner-tasks', projectId] });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });
}
