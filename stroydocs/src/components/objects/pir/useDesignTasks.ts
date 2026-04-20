'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { DesignTaskType } from '@prisma/client';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

interface DesignTaskUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DesignTaskItem {
  id: string;
  number: string;
  docDate: string;
  taskType: DesignTaskType;
  status: string;
  s3Keys: string[];
  notes: string | null;
  approvedBy: DesignTaskUser | null;
  agreedBy: DesignTaskUser | null;
  author: DesignTaskUser;
  _count: { comments: number; parameters: number };
  createdAt: string;
  updatedAt: string;
}

interface DesignTaskListResponse {
  data: DesignTaskItem[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface CreateDesignTaskPayload {
  taskType: DesignTaskType;
  docDate?: string;
  approvedById?: string;
  agreedById?: string;
  customerOrgId?: string;
  customerPersonId?: string;
  s3Keys?: string[];
  notes?: string;
}

// ─────────────────────────────────────────────
// Хук для списка заданий ПИР
// ─────────────────────────────────────────────

export function useDesignTasks(projectId: string, taskType: DesignTaskType = 'DESIGN') {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/design-tasks`;

  const { data, isLoading, isError } = useQuery<DesignTaskListResponse>({
    queryKey: ['design-tasks', projectId, taskType],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}?taskType=${taskType}&limit=50`);
      if (!res.ok) throw new Error('Ошибка загрузки заданий ПИР');
      const json: ApiResponse<DesignTaskListResponse> = await res.json();
      return json.data;
    },
    enabled: !!projectId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['design-tasks', projectId, taskType] });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateDesignTaskPayload) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка создания задания');
      }
      const json: ApiResponse<DesignTaskItem> = await res.json();
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Задание создано' });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`${baseUrl}/${taskId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка удаления задания');
      }
    },
    onSuccess: () => {
      toast({ title: 'Задание удалено' });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['counts', 'object', projectId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    tasks: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    createMutation,
    deleteMutation,
  };
}
