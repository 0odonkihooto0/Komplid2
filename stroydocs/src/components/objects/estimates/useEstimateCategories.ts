'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type EstimateCategoryNode = {
  id: string;
  name: string;
  order: number;
  parentId: string | null;
  createdAt: string;
  children: EstimateCategoryNode[];
  _count: { versions: number };
};

// ─── Хук ────────────────────────────────────────────────────────────────────

export function useEstimateCategories(objectId: string) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Запрос: дерево категорий смет
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery<EstimateCategoryNode[]>({
    queryKey: ['estimate-categories', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/estimate-categories`);
      const json = await res.json() as { success: boolean; data: EstimateCategoryNode[] };
      if (!json.success) throw new Error('Ошибка загрузки категорий');
      return json.data;
    },
    enabled: !!objectId,
  });

  // Мутация: создать категорию
  const createCategory = useMutation({
    mutationFn: async (payload: { name: string; parentId?: string }) => {
      const res = await fetch(`/api/projects/${objectId}/estimate-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания категории');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['estimate-categories', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Мутация: переименовать категорию
  const renameCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const res = await fetch(`/api/projects/${objectId}/estimate-categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка переименования');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['estimate-categories', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Мутация: удалить категорию
  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await fetch(`/api/projects/${objectId}/estimate-categories/${categoryId}`, {
        method: 'DELETE',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: (_data, categoryId) => {
      if (selectedCategoryId === categoryId) setSelectedCategoryId(null);
      void qc.invalidateQueries({ queryKey: ['estimate-categories', objectId] });
      void qc.invalidateQueries({ queryKey: ['estimate-versions', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return {
    categories,
    categoriesLoading,
    selectedCategoryId,
    setSelectedCategoryId,
    createCategory,
    renameCategory,
    deleteCategory,
  };
}
