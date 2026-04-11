'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

export interface PIRCategoryConfigItem {
  id: string;
  categoryCode: string;
  categoryName: string;
  parentCode: string | null;
  enabled: boolean;
  order: number;
  configId: string;
}

export interface PIRObjectTypeConfigItem {
  id: string;
  objectType: string;
  projectId: string;
  createdAt: string;
  categories: PIRCategoryConfigItem[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─────────────────────────────────────────────
// Хук конфига ПИР
// ─────────────────────────────────────────────

export function usePIRConfig(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/pir-config`;

  const { data, isLoading } = useQuery<PIRObjectTypeConfigItem | null>({
    queryKey: ['pir-config', projectId],
    queryFn: async () => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error('Ошибка загрузки конфига ПИР');
      const json: ApiResponse<PIRObjectTypeConfigItem | null> = await res.json();
      return json.data;
    },
    enabled: !!projectId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['pir-config', projectId] });

  // Создать конфиг (шаг 1 диалога)
  const createMutation = useMutation({
    mutationFn: async (objectType: string) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка создания конфига ПИР');
      }
      const json: ApiResponse<PIRObjectTypeConfigItem> = await res.json();
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Параметры ПИР созданы' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  // Обновить категории (шаг 2 диалога)
  const updateCategoriesMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; enabled?: boolean; order?: number }>) => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка обновления категорий ПИР');
      }
    },
    onSuccess: () => {
      toast({ title: 'Категории обновлены' });
      invalidate();
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return {
    config: data ?? null,
    categories: data?.categories ?? [],
    isLoading,
    createMutation,
    updateCategoriesMutation,
  };
}
