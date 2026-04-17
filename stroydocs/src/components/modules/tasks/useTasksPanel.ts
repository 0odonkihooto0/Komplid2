'use client';

import { useQuery } from '@tanstack/react-query';
import { type GlobalTask, type TaskCounts } from './useGlobalTasks';

interface TasksPanelData {
  tasks: GlobalTask[];
  overdueCount: number;
}

export function useTasksPanel() {
  const { data, isLoading, refetch } = useQuery<TasksPanelData>({
    queryKey: ['tasks-quick-panel'],
    queryFn: async () => {
      const sp = new URLSearchParams({
        grouping: 'active',
        visibleTo: 'me',
        pageSize: '20',
        sortBy: 'deadline',
        sortDir: 'asc',
      });
      const res = await fetch(`/api/tasks?${sp.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return {
        tasks: json.data.tasks as GlobalTask[],
        overdueCount: (json.data.counts as TaskCounts).overdue,
      };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return {
    tasks: data?.tasks ?? [],
    overdueCount: data?.overdueCount ?? 0,
    isLoading,
    refetch,
  };
}
