'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { BimAccessLevel, BimModelStage } from '@prisma/client';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface BimAccessItem {
  id: string;
  level: BimAccessLevel;
  stage: BimModelStage | null;
  status: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface CreateAccessPayload {
  userId: string;
  level: BimAccessLevel;
  stage?: BimModelStage | null;
  status?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ─── Метки enum-ов ───────────────────────────────────────────────────────────

export const ACCESS_LEVEL_LABELS: Record<BimAccessLevel, string> = {
  [BimAccessLevel.VIEW]: 'Просмотр',
  [BimAccessLevel.ADD]: 'Добавление',
  [BimAccessLevel.EDIT]: 'Редактирование',
  [BimAccessLevel.DELETE]: 'Удаление',
};

export const STAGE_LABELS: Record<BimModelStage, string> = {
  [BimModelStage.OTR]: 'ОТР',
  [BimModelStage.PROJECT]: 'П',
  [BimModelStage.WORKING]: 'Р',
  [BimModelStage.CONSTRUCTION]: 'В производство',
};

// ─── Хуки ────────────────────────────────────────────────────────────────────

export function useBimAccess(projectId: string) {
  const query = useQuery<BimAccessItem[]>({
    queryKey: ['bim-access', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/bim/access`);
      const json: ApiResponse<BimAccessItem[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки настроек доступа');
      return json.data;
    },
    staleTime: 30_000,
  });

  return {
    accessList: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useCreateBimAccess(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateAccessPayload) => {
      const res = await fetch(`/api/projects/${projectId}/bim/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json: ApiResponse<BimAccessItem> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка добавления прав');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bim-access', projectId] });
      toast({ title: 'Права добавлены' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBimAccess(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (accessId: string) => {
      const res = await fetch(`/api/projects/${projectId}/bim/access/${accessId}`, {
        method: 'DELETE',
      });
      const json: ApiResponse<{ id: string }> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления прав');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bim-access', projectId] });
      toast({ title: 'Права удалены' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
}
