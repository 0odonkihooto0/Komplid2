'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнена',
  CANCELLED: 'Отменена',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Критический',
};

// Цвет точки приоритета
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-600',
};

export interface TaskAssignee {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  assigneeId: string | null;
  assignee: TaskAssignee | null;
  contractId: string | null;
  createdAt: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
  assigneeId?: string;
  contractId?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  deadline?: string | null;
  assigneeId?: string | null;
}

export function useTasks(projectId: string, statusFilter: TaskStatus | null = null) {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', projectId, statusFilter],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/projects/${projectId}/tasks?status=${statusFilter}`
        : `/api/projects/${projectId}/tasks`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const invalidate = () => {
    // Инвалидируем все варианты фильтра
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Task;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Задача создана' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskData }) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Task;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Задача удалена' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    },
  });

  return { tasks, isLoading, createMutation, updateMutation, deleteMutation };
}
