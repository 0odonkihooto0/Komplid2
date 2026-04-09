'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { ProblemIssueType } from '@prisma/client';

export interface ProblemIssue {
  id: string;
  type: ProblemIssueType;
  status: 'ACTIVE' | 'CLOSED';
  description: string;
  resolution: string | null;
  responsible: string | null;
  deadline: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  authorId: string;
  author: { id: string; firstName: string; lastName: string };
}

export interface ProblemIssueSummary {
  active: number;
  closed: number;
}

/** Счётчики по типу проблемного вопроса */
export type ProblemIssueSummaryMap = Record<ProblemIssueType, ProblemIssueSummary>;

interface CreateInput {
  type: ProblemIssueType;
  description: string;
  responsible?: string;
  deadline?: string; // ISO datetime
}

interface UpdateInput {
  status?: 'ACTIVE' | 'CLOSED';
  description?: string;
  responsible?: string;
  deadline?: string | null;
}

export function useProblemIssues(projectId: string) {
  const qk = ['problem-issues', projectId] as const;

  const query = useQuery<ProblemIssue[]>({
    queryKey: qk,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/problem-issues?limit=200`);
      const json = (await res.json()) as { success: boolean; data: { data: ProblemIssue[] } };
      if (!json.success) throw new Error('Ошибка загрузки');
      return json.data.data;
    },
    enabled: !!projectId,
  });

  // Сводка по типам: { CORRECTION_PSD: { active: N, closed: M }, ... }
  const summary = useMemo<ProblemIssueSummaryMap>(() => {
    const result = {} as ProblemIssueSummaryMap;
    for (const type of Object.values(ProblemIssueType)) {
      result[type] = { active: 0, closed: 0 };
    }
    for (const issue of query.data ?? []) {
      if (issue.status === 'ACTIVE') result[issue.type].active++;
      else result[issue.type].closed++;
    }
    return result;
  }, [query.data]);

  return { issues: query.data ?? [], isLoading: query.isLoading, summary };
}

export function useCreateProblemIssue(projectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateInput) => {
      const res = await fetch(`/api/projects/${projectId}/problem-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания');
      return json.data as ProblemIssue;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['problem-issues', projectId] });
      toast({ title: 'Проблемный вопрос добавлен' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useUpdateProblemIssue(projectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateInput & { id: string }) => {
      const res = await fetch(`/api/projects/${projectId}/problem-issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления');
      return json.data as ProblemIssue;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['problem-issues', projectId] });
      toast({ title: 'Обновлено' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}

export function useDeleteProblemIssue(projectId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/problem-issues/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['problem-issues', projectId] });
      toast({ title: 'Удалено' });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });
}
