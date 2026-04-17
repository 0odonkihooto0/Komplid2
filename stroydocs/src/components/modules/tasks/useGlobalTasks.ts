'use client';

import { useQuery } from '@tanstack/react-query';

export type TaskStatus = 'OPEN' | 'PLANNED' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'REVISION' | 'DONE' | 'IRRELEVANT' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskRoleType = 'AUTHOR' | 'EXECUTOR' | 'CONTROLLER' | 'OBSERVER';

export interface GlobalTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  plannedStartDate: string | null;
  deadline: string | null;
  isReadByAuthor: boolean;
  publicLinkToken: string | null;
  createdBy: { id: string; firstName: string; lastName: string };
  roles: Array<{ role: TaskRoleType; user: { id: string; firstName: string; lastName: string } }>;
  labels: Array<{ label: { id: string; name: string; color: string } }>;
  _count: { checklist: number; reports: number; childTasks: number };
}

export interface TaskCounts {
  all: number;
  active: number;
  executor: number;
  controller: number;
  observer: number;
  author: number;
  irrelevant: number;
  overdue: number;
  completed: number;
  today: number;
  week: number;
}

export const DEFAULT_TASK_COUNTS: TaskCounts = {
  all: 0, active: 0, executor: 0, controller: 0,
  observer: 0, author: 0, irrelevant: 0, overdue: 0,
  completed: 0, today: 0, week: 0,
};

export interface UseGlobalTasksParams {
  grouping: string;
  groupId?: string | null;
  search?: string;
  period?: string;
  page: number;
}

interface TasksResponse {
  tasks: GlobalTask[];
  counts: TaskCounts;
  total: number;
  totalPages: number;
}

export function useGlobalTasks(params: UseGlobalTasksParams) {
  const { data, isLoading } = useQuery<TasksResponse>({
    queryKey: ['global-tasks', params],
    queryFn: async () => {
      const sp = new URLSearchParams({
        grouping: params.grouping,
        page: String(params.page),
        pageSize: '20',
      });
      if (params.groupId) sp.set('groupId', params.groupId);
      if (params.search) sp.set('search', params.search);
      const res = await fetch(`/api/tasks?${sp.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return {
        tasks: json.data.tasks as GlobalTask[],
        counts: json.data.counts as TaskCounts,
        total: json.total as number,
        totalPages: json.totalPages as number,
      };
    },
    staleTime: 30_000,
  });

  return {
    tasks: data?.tasks ?? [],
    counts: data?.counts ?? DEFAULT_TASK_COUNTS,
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    isLoading,
  };
}
