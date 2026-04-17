'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type TaskStatus } from './useGlobalTasks';

export interface FeedItem {
  type: 'task_created' | 'report_added';
  id: string;
  taskId: string;
  taskTitle: string;
  taskStatus: TaskStatus;
  taskLabels: Array<{ id: string; name: string; color: string }>;
  taskDescription: string | null;
  author: { id: string; firstName: string; lastName: string };
  content: string | null;
  timestamp: string;
}

interface UseFeedTasksParams {
  grouping: string;
  groupId?: string;
  search?: string;
}

export function useFeedTasks(params: UseFeedTasksParams) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<FeedItem[]>({
    queryKey: ['task-feed', params, page],
    queryFn: async () => {
      const sp = new URLSearchParams({ grouping: params.grouping, page: String(page), pageSize: '20' });
      if (params.groupId) sp.set('groupId', params.groupId);
      if (params.search) sp.set('search', params.search);
      const res = await fetch(`/api/tasks/feed?${sp.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as FeedItem[];
    },
    staleTime: 30_000,
  });

  return {
    items: data ?? [],
    isLoading,
    page,
    setPage,
    hasMore: (data?.length ?? 0) >= 20,
  };
}
