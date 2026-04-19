'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

interface Employee { id: string; firstName: string; lastName: string; position: string | null }
interface Project { id: string; name: string }
interface TaskGroup { id: string; name: string }
interface TaskType { id: string; name: string; key: string }
interface TaskLabel { id: string; name: string; color: string }

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline?: string;
  plannedStartDate?: string;
  projectId: string;
  groupId?: string;
  typeId?: string;
  parentTaskId?: string;
  executors: string[];
  controllers: string[];
  observers: string[];
  labelIds: string[];
}

export function useCreateTaskFull() {
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      return (json.success ? json.data : []) as Employee[];
    },
    staleTime: 60_000,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const res = await fetch('/api/projects?limit=100');
      const json = await res.json();
      return (json.success ? json.data : []) as Project[];
    },
    staleTime: 60_000,
  });

  const { data: taskGroups = [] } = useQuery<TaskGroup[]>({
    queryKey: ['task-groups'],
    queryFn: async () => {
      const res = await fetch('/api/task-groups');
      const json = await res.json();
      return (json.success ? json.data : []) as TaskGroup[];
    },
    staleTime: 60_000,
  });

  const { data: taskTypes = [] } = useQuery<TaskType[]>({
    queryKey: ['task-types'],
    queryFn: async () => {
      const res = await fetch('/api/task-types');
      const json = await res.json();
      return (json.success ? json.data : []) as TaskType[];
    },
    staleTime: 60_000,
  });

  const { data: taskLabels = [] } = useQuery<TaskLabel[]>({
    queryKey: ['task-labels'],
    queryFn: async () => {
      const res = await fetch('/api/task-labels');
      const json = await res.json();
      return (json.success ? json.data : []) as TaskLabel[];
    },
    staleTime: 60_000,
  });

  const createTask = useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания');
      return json.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['global-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (variables.projectId) {
        void queryClient.invalidateQueries({ queryKey: ['counts', 'object', variables.projectId] });
      }
      toast({ title: 'Задача создана' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return { employees, projects, taskGroups, taskTypes, taskLabels, createTask };
}
