'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';

export interface TaskGroupItem {
  id: string;
  name: string;
  parentId: string | null;
  visibility: 'EVERYONE' | 'SELECTED';
  visibleUserIds: string[];
  order: number;
  _count: { tasks: number; children: number };
  children?: TaskGroupItem[];
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
}

// Преобразование плоского списка групп в дерево
function buildGroupTree(groups: TaskGroupItem[]): TaskGroupItem[] {
  const map = new Map<string, TaskGroupItem>();
  for (const g of groups) {
    map.set(g.id, { ...g, children: [] });
  }
  const roots: TaskGroupItem[] = [];
  for (const g of Array.from(map.values())) {
    if (g.parentId) {
      const parent = map.get(g.parentId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(g);
      } else {
        roots.push(g);
      }
    } else {
      roots.push(g);
    }
  }
  return roots.sort((a, b) => a.order - b.order);
}

export function useTaskGroups() {
  const { data, isLoading } = useQuery<TaskGroupItem[]>({
    queryKey: ['task-groups'],
    queryFn: async () => {
      const res = await fetch('/api/tasks/groups');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskGroupItem[];
    },
    staleTime: 60_000,
  });

  const groups = data ?? [];
  const groupTree = buildGroupTree(groups);

  return { groups, groupTree, isLoading };
}

export function useCreateTaskGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      parentId?: string;
      visibility: 'EVERYONE' | 'SELECTED';
      order: number;
    }) => {
      const res = await fetch('/api/tasks/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskGroupItem;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task-groups'] });
      toast({ title: 'Группа задач создана' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCreateTaskLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      color: string;
      groupId?: string;
    }) => {
      const res = await fetch('/api/tasks/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TaskLabel;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task-labels'] });
      toast({ title: 'Метка создана' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });
}
