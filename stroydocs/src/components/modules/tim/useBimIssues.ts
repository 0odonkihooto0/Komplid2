'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

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

// ─── Хук списка замечаний ────────────────────────────────────────────────────

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

// ─── BCF Экспорт ─────────────────────────────────────────────────────────────

export function useBcfExport(projectId: string) {
  const { toast } = useToast();

  const mutation = useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/bim/issues/export-bcf`);
      const json: ApiResponse<{ url: string }> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка экспорта BCF');
      window.open(json.data.url, '_blank');
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка экспорта BCF',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    exportBcf: () => mutation.mutate(),
    isPending: mutation.isPending,
  };
}

// ─── BCF Импорт ──────────────────────────────────────────────────────────────

export function useBcfImport(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation<{ imported: number }, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/projects/${projectId}/bim/issues/import-bcf`, {
        method: 'POST',
        body: formData,
      });
      const json: ApiResponse<{ imported: number }> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка импорта BCF');
      return json.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'BCF импортирован',
        description: `Импортировано топиков: ${data.imported}`,
      });
      void queryClient.invalidateQueries({ queryKey: ['bim-issues', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка импорта BCF',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    importBcf: (file: File) => mutation.mutate(file),
    isPending: mutation.isPending,
  };
}
