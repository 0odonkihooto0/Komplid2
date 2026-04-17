'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export interface TaskTemplateSchedule {
  id: string;
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
}

export interface TaskTemplateItem {
  id: string;
  name: string;
  description: string | null;
  typeId: string | null;
  groupId: string | null;
  parentTemplateId: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  duration: number | null;
  s3Keys: string[];
  organizationId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  taskType: { id: string; key: string; name: string } | null;
  group: { id: string; name: string } | null;
  author: { id: string; firstName: string; lastName: string };
  schedules: TaskTemplateSchedule[];
  _count: { children: number };
}

export interface TaskTemplateDetail extends TaskTemplateItem {
  children: Array<{ id: string; name: string; priority: string; duration: number | null }>;
  parentTemplate: { id: string; name: string } | null;
}

interface UseTaskTemplatesParams {
  groupId?: string;
  typeId?: string;
  parentTemplateId?: string | null;
}

export function useTaskTemplates(params: UseTaskTemplatesParams = {}) {
  const { groupId, typeId, parentTemplateId } = params;

  const { data, isLoading } = useQuery<TaskTemplateItem[]>({
    queryKey: ['task-templates', { groupId, typeId, parentTemplateId }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (groupId) sp.set('groupId', groupId);
      if (typeId) sp.set('typeId', typeId);
      if (parentTemplateId !== undefined) sp.set('parentTemplateId', parentTemplateId ?? 'null');
      const res = await fetch(`/api/task-templates${sp.toString() ? `?${sp}` : ''}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskTemplateItem[];
    },
    staleTime: 30_000,
  });

  return { templates: data ?? [], isLoading };
}

export function useTaskTemplate(id: string | null) {
  const { data, isLoading } = useQuery<TaskTemplateDetail>({
    queryKey: ['task-template', id],
    queryFn: async () => {
      const res = await fetch(`/api/task-templates/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskTemplateDetail;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  return { template: data ?? null, isLoading };
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      typeId?: string | null;
      groupId?: string | null;
      parentTemplateId?: string | null;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      duration?: number | null;
      s3Keys?: string[];
    }) => {
      const res = await fetch('/api/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskTemplateItem;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast({ title: 'Шаблон создан' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: string;
      name?: string;
      description?: string | null;
      typeId?: string | null;
      groupId?: string | null;
      parentTemplateId?: string | null;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      duration?: number | null;
      s3Keys?: string[];
    }) => {
      const res = await fetch(`/api/task-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskTemplateItem;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['task-template', vars.id] });
      toast({ title: 'Шаблон обновлён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/task-templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast({ title: 'Шаблон удалён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useInstantiateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: string;
      projectId: string;
      deadline?: string | null;
      plannedStartDate?: string | null;
      executors: string[];
      controllers?: string[];
      observers?: string[];
    }) => {
      const res = await fetch(`/api/task-templates/${id}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['global-tasks'] });
      toast({ title: 'Задача создана по шаблону' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
