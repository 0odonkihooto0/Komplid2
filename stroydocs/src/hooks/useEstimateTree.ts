'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы данных ─────────────────────────────────────────────────────────────

export interface EstimateItemDetail {
  id: string;
  code: string | null;
  name: string;
  unit: string | null;
  volume: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  laborCost: number | null;
  materialCost: number | null;
  machineryCost: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  sortOrder: number | null;
}

export interface EstimateChapterDetail {
  id: string;
  code: string | null;
  name: string;
  level: number;
  order: number;
  totalAmount: number | null;
  totalLabor: number | null;
  totalMat: number | null;
  parentId: string | null;
  items: EstimateItemDetail[];
  children: EstimateChapterDetail[];
}

export interface EstimateVersionDetail {
  id: string;
  name: string;
  versionType: 'BASELINE' | 'ACTUAL' | 'CORRECTIVE';
  isBaseline: boolean;
  isActual: boolean;
  period: string | null;
  totalAmount: number | null;
  totalLabor: number | null;
  totalMat: number | null;
  contractId: string;
  chapters: EstimateChapterDetail[];
}

// ─── Входные данные для создания позиции ─────────────────────────────────────

export interface AddItemInput {
  name: string;
  unit?: string;
  volume?: number;
  unitPrice?: number;
  code?: string;
}

// ─── Хук ─────────────────────────────────────────────────────────────────────

interface UseEstimateTreeParams {
  projectId: string;
  contractId: string;
  versionId: string;
}

const base = (p: string, c: string, v: string) =>
  `/api/objects/${p}/contracts/${c}/estimate-versions/${v}`;

export function useEstimateTree({ projectId, contractId, versionId }: UseEstimateTreeParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ключ кэша для данной версии сметы
  const queryKey = ['estimate-version', versionId];

  // Загрузка полной версии с главами и позициями
  const { data: version, isLoading } = useQuery<EstimateVersionDetail>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`${base(projectId, contractId, versionId)}`);
      const json = await res.json() as { success: boolean; data: EstimateVersionDetail };
      if (!json.success) throw new Error('Ошибка загрузки версии сметы');
      return json.data;
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  // Добавить раздел (главу)
  const addChapter = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${base(projectId, contractId, versionId)}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания раздела');
    },
    onSuccess: () => {
      toast({ title: 'Раздел добавлен' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Переименовать раздел
  const renameChapter = useMutation({
    mutationFn: async ({ chapterId, name }: { chapterId: string; name: string }) => {
      const res = await fetch(`${base(projectId, contractId, versionId)}/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка переименования');
    },
    onSuccess: () => {
      toast({ title: 'Раздел переименован' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Удалить раздел
  const deleteChapter = useMutation({
    mutationFn: async (chapterId: string) => {
      const res = await fetch(`${base(projectId, contractId, versionId)}/chapters/${chapterId}`, {
        method: 'DELETE',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления раздела');
    },
    onSuccess: () => {
      toast({ title: 'Раздел удалён' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Добавить позицию в раздел
  const addItem = useMutation({
    mutationFn: async ({ chapterId, data }: { chapterId: string; data: AddItemInput }) => {
      const res = await fetch(
        `${base(projectId, contractId, versionId)}/chapters/${chapterId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка добавления позиции');
    },
    onSuccess: () => {
      toast({ title: 'Позиция добавлена' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Обновить позицию (объём или цена) — сервер сам пересчитывает итоги
  const updateItem = useMutation({
    mutationFn: async ({
      itemId,
      volume,
      unitPrice,
    }: {
      itemId: string;
      volume?: number;
      unitPrice?: number;
    }) => {
      const res = await fetch(`${base(projectId, contractId, versionId)}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume, unitPrice }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления позиции');
    },
    onSuccess: () => {
      // Перезагружаем версию — итоги пересчитаны сервером
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка сохранения', description: err.message, variant: 'destructive' });
    },
  });

  // Удалить позицию (soft delete)
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`${base(projectId, contractId, versionId)}/items/${itemId}`, {
        method: 'DELETE',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления позиции');
    },
    onSuccess: () => {
      toast({ title: 'Позиция удалена' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return {
    version,
    isLoading,
    addChapter,
    renameChapter,
    deleteChapter,
    addItem,
    updateItem,
    deleteItem,
  };
}
