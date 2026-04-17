'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import type { TaskRoleType, TaskStatus, TaskPriority } from './useGlobalTasks';

export interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  plannedStartDate: string | null;
  deadline: string | null;
  actualStartDate: string | null;
  completedAt: string | null;
  isReadByAuthor: boolean;
  publicLinkToken: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  taskType: { id: string; key: string; name: string } | null;
  group: { id: string; name: string } | null;
  parentTask: { id: string; title: string; status: TaskStatus } | null;
  childTasks: Array<{ id: string; title: string; status: TaskStatus; priority: TaskPriority; deadline: string | null }>;
  roles: Array<{ role: TaskRoleType; user: { id: string; firstName: string; lastName: string } }>;
  labels: Array<{ label: { id: string; name: string; color: string } }>;
  checklist: Array<{ id: string; title: string; done: boolean; order: number; s3Keys: string[] }>;
  reports: Array<{ id: string; progress: string; newDeadline: string | null; s3Keys: string[]; createdAt: string; author: { id: string; firstName: string; lastName: string } }>;
  _count: { checklist: number; reports: number; childTasks: number };
}

export interface TaskComment {
  id: string;
  text: string;
  s3Keys: string[];
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Ошибка запроса');
  return json.data as T;
}

export function useTaskDetail(taskId: string | null) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? '';

  const { data: task, isLoading } = useQuery<TaskDetail>({
    queryKey: ['task-detail', taskId],
    queryFn: () => apiFetch<TaskDetail>(`/api/tasks/${taskId}`),
    enabled: !!taskId,
    staleTime: 15_000,
  });

  const { data: comments = [] } = useQuery<TaskComment[]>({
    queryKey: ['task-comments', taskId],
    queryFn: () => apiFetch<TaskComment[]>(`/api/tasks/${taskId}/comments`),
    enabled: !!taskId,
    staleTime: 15_000,
  });

  const currentUserRole: TaskRoleType | null =
    task?.roles.find((r) => r.user.id === userId)?.role ?? null;

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
    void queryClient.invalidateQueries({ queryKey: ['global-tasks'] });
  }

  const updateTask = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const doAction = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/api/tasks/${taskId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Действие выполнено' });
    },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const toggleChecklistItem = useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      apiFetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
      }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] }); },
  });

  const addChecklistItem = useMutation({
    mutationFn: (data: { title: string }) =>
      apiFetch(`/api/tasks/${taskId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] }); },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const deleteChecklistItem = useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/api/tasks/${taskId}/checklist/${itemId}`, { method: 'DELETE' }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] }); },
  });

  const reorderChecklist = useMutation({
    mutationFn: (items: Array<{ id: string; order: number }>) =>
      apiFetch(`/api/tasks/${taskId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder: items }),
      }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] }); },
  });

  const addReport = useMutation({
    mutationFn: (data: { progress: string; newDeadline?: string }) =>
      apiFetch(`/api/tasks/${taskId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Отчёт добавлен' });
    },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const addComment = useMutation({
    mutationFn: (text: string) =>
      apiFetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] }); },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const createPublicLink = useMutation({
    mutationFn: () =>
      apiFetch<{ publicLinkToken: string }>(`/api/tasks/${taskId}/public-link`, { method: 'POST' }),
    onSuccess: (data) => {
      invalidate();
      const url = `${window.location.origin}/tasks/public/${data.publicLinkToken}`;
      void navigator.clipboard.writeText(url);
      toast({ title: 'Ссылка скопирована' });
    },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  return {
    task,
    isLoading,
    comments,
    currentUserRole,
    updateTask,
    doAction,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
    reorderChecklist,
    addReport,
    addComment,
    createPublicLink,
  };
}
