'use client';

import { useQuery } from '@tanstack/react-query';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface BimIssueElement {
  id: string;
  ifcGuid: string;
  ifcType: string;
  name: string | null;
}

export interface BimIssueModel {
  id: string;
  name: string;
}

export interface BimIssueDefect {
  id: string;
  title: string;
  category: string | null;
  status: string;
  deadline: string | null;
  resolvedAt: string | null;
  createdAt: string;
  author: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
}

export interface BimIssueRow {
  linkId: string;
  element: BimIssueElement;
  model: BimIssueModel;
  defect: BimIssueDefect | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number };
  error?: string;
}

// ─── Метки статусов замечаний ──────────────────────────────────────────────

export const DEFECT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыто',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Устранено',
  CLOSED: 'Закрыто',
};

export const DEFECT_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  OPEN: 'destructive',
  IN_PROGRESS: 'default',
  RESOLVED: 'secondary',
  CLOSED: 'outline',
};

// ─── Хук ─────────────────────────────────────────────────────────────────────

export function useBimIssues(projectId: string) {
  const query = useQuery<BimIssueRow[]>({
    queryKey: ['bim-issues', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/bim/issues?limit=50`);
      const json: ApiResponse<BimIssueRow[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки замечаний');
      return json.data;
    },
    staleTime: 30_000,
  });

  return {
    issues: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
