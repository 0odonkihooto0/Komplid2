'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы ───────────────────────────────────────────────────────────────────

export interface BimSection {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string;
  order: number;
  children: BimSection[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ─── Утилиты ────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Ошибка запроса');
  return json.data;
}

// ─── Хуки ───────────────────────────────────────────────────────────────────

export function useSections(projectId: string) {
  return useQuery<BimSection[]>({
    queryKey: ['bim-sections', projectId],
    queryFn: () =>
      apiFetch<BimSection[]>(`/api/projects/${projectId}/bim/sections`),
    staleTime: 30_000,
  });
}

export function useCreateSection(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; parentId?: string | null }) =>
      apiFetch(`/api/projects/${projectId}/bim/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bim-sections', projectId] });
      toast({ title: 'Раздел создан' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRenameSection(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ sectionId, name }: { sectionId: string; name: string }) =>
      apiFetch(`/api/projects/${projectId}/bim/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bim-sections', projectId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSection(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (sectionId: string) =>
      apiFetch(`/api/projects/${projectId}/bim/sections/${sectionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bim-sections', projectId] });
      toast({ title: 'Раздел удалён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}
