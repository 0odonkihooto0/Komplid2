'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type GlobalTask, type TaskStatus, type TaskRoleType } from './useGlobalTasks';

interface UseTaskKanbanParams {
  grouping: string;
  groupId?: string | null;
  search?: string;
}

interface TransitionRule {
  action: string;
  roles: TaskRoleType[];
}

// Допустимые переходы статусов через actions API
const TRANSITION_MAP: Partial<Record<TaskStatus, Partial<Record<TaskStatus, TransitionRule>>>> = {
  OPEN: {
    IN_PROGRESS: { action: 'start', roles: ['EXECUTOR'] },
    IRRELEVANT: { action: 'mark-irrelevant', roles: ['AUTHOR', 'CONTROLLER'] },
  },
  PLANNED: {
    IN_PROGRESS: { action: 'start', roles: ['EXECUTOR'] },
    IRRELEVANT: { action: 'mark-irrelevant', roles: ['AUTHOR', 'CONTROLLER'] },
  },
  IN_PROGRESS: {
    UNDER_REVIEW: { action: 'send-to-review', roles: ['EXECUTOR'] },
    IRRELEVANT: { action: 'mark-irrelevant', roles: ['AUTHOR', 'CONTROLLER'] },
  },
  UNDER_REVIEW: {
    DONE: { action: 'accept', roles: ['CONTROLLER'] },
    REVISION: { action: 'return-to-revision', roles: ['CONTROLLER'] },
    IN_PROGRESS: { action: 'cancel-review', roles: ['EXECUTOR'] },
    IRRELEVANT: { action: 'mark-irrelevant', roles: ['AUTHOR', 'CONTROLLER'] },
  },
  REVISION: {
    UNDER_REVIEW: { action: 'send-to-review', roles: ['EXECUTOR'] },
    IRRELEVANT: { action: 'mark-irrelevant', roles: ['AUTHOR', 'CONTROLLER'] },
  },
};

export function getTransition(from: TaskStatus, to: TaskStatus): TransitionRule | null {
  return TRANSITION_MAP[from]?.[to] ?? null;
}

export function canUserDoTransition(
  task: GlobalTask,
  from: TaskStatus,
  to: TaskStatus,
  currentUserId: string,
): boolean {
  const rule = getTransition(from, to);
  if (!rule) return false;
  const userRoles = task.roles
    .filter((r) => r.user.id === currentUserId)
    .map((r) => r.role);
  const isCreator = task.createdBy.id === currentUserId;
  return rule.roles.some((r) => userRoles.includes(r) || (r === 'AUTHOR' && isCreator));
}

export function useTaskKanban(params: UseTaskKanbanParams) {
  const queryClient = useQueryClient();
  const queryKey = ['global-tasks-kanban', params];

  const { data, isLoading } = useQuery<GlobalTask[]>({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams({
        grouping: params.grouping,
        page: '1',
        pageSize: '200',
      });
      if (params.groupId) sp.set('groupId', params.groupId);
      if (params.search) sp.set('search', params.search);
      const res = await fetch(`/api/tasks?${sp.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.tasks as GlobalTask[];
    },
    staleTime: 30_000,
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ taskId, action }: { taskId: string; action: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка смены статуса');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    tasks: data ?? [],
    isLoading,
    changeStatus: changeStatusMutation.mutateAsync,
    queryKey,
  };
}
