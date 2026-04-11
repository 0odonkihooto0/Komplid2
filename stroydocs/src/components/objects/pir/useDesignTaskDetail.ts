'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { ApprovalRoute } from '@/components/modules/approval/types';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

interface TaskUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface TaskOrg {
  id: string;
  name: string;
}

export interface DesignTaskParam {
  id: string;
  paramKey: string;
  paramName: string;
  value: string | null;
  order: number;
  hasComment: boolean;
}

export interface DesignTaskDetail {
  id: string;
  number: string;
  docDate: string;
  taskType: 'DESIGN' | 'SURVEY';
  status: string;
  s3Keys: string[];
  notes: string | null;
  author: TaskUser;
  approvedBy: TaskUser | null;
  agreedBy: TaskUser | null;
  customerOrg: TaskOrg | null;
  customerPerson: TaskUser | null;
  parameters: DesignTaskParam[];
  comments: { id: string }[];
  approvalRoute: ApprovalRoute | null;
  _count: { comments: number; parameters: number };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─────────────────────────────────────────────
// Хук для карточки задания ПИР
// ─────────────────────────────────────────────

export function useDesignTaskDetail(projectId: string, taskId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/objects/${projectId}/design-tasks/${taskId}`;

  const { data: task, isLoading, isError } = useQuery<DesignTaskDetail>({
    queryKey: ['design-task', taskId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки задания ПИР');
      const json: ApiResponse<DesignTaskDetail> = await res.json();
      return json.data;
    },
    enabled: !!taskId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['design-task', taskId] });

  const conductMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/conduct`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка проведения задания');
      }
    },
    onSuccess: () => {
      toast({ title: 'Задание проведено' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка аннулирования задания');
      }
    },
    onSuccess: () => {
      toast({ title: 'Задание аннулировано' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    task,
    isLoading,
    isError,
    conductMutation,
    cancelMutation,
  };
}
