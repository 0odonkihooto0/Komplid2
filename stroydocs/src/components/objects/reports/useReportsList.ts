'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type CategoryWithChildren = {
  id: string;
  name: string;
  order: number;
  parentId: string | null;
  createdAt: string;
  children: CategoryWithChildren[];
};

export type ReportListItem = {
  id: string;
  number: number;
  name: string;
  status: 'DRAFT' | 'GENERATED' | 'SIGNED';
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string } | null;
  category: { id: string; name: string } | null;
  _count: { blocks: number };
};

export type ReportTemplate = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
};

// ─── Payload-типы для мутаций ────────────────────────────────────────────────

export type CreateReportPayload = {
  name: string;
  categoryId?: string;
  periodStart?: string;
  periodEnd?: string;
};

export type CreateFromTemplatePayload = {
  templateId: string;
  name: string;
  categoryId?: string;
  periodStart?: string;
  periodEnd?: string;
};

// ─── Хук ────────────────────────────────────────────────────────────────────

export function useReportsList(objectId: string) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createFromTemplateOpen, setCreateFromTemplateOpen] = useState(false);

  // ─── Запрос: дерево категорий ──────────────────────────────────────────────
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery<CategoryWithChildren[]>({
    queryKey: ['report-categories', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/reports/categories`);
      const json = await res.json() as { success: boolean; data: CategoryWithChildren[] };
      if (!json.success) throw new Error('Ошибка загрузки категорий');
      return json.data;
    },
    enabled: !!objectId,
  });

  // ─── Запрос: список отчётов ────────────────────────────────────────────────
  const {
    data: reportsData,
    isLoading: reportsLoading,
  } = useQuery<{ data: ReportListItem[]; total: number; page: number; limit: number }>({
    queryKey: ['reports', objectId, selectedCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
      const res = await fetch(`/api/projects/${objectId}/reports?${params.toString()}`);
      const json = await res.json() as { success: boolean; data: { data: ReportListItem[]; total: number; page: number; limit: number } };
      if (!json.success) throw new Error('Ошибка загрузки отчётов');
      return json.data;
    },
    enabled: !!objectId,
  });

  const reports = reportsData?.data ?? [];
  const reportsTotal = reportsData?.total ?? 0;

  // ─── Мутация: создать отчёт ───────────────────────────────────────────────
  const createReport = useMutation({
    mutationFn: async (payload: CreateReportPayload) => {
      const res = await fetch(`/api/projects/${objectId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; data: ReportListItem; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания отчёта');
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Отчёт создан' });
      void qc.invalidateQueries({ queryKey: ['reports', objectId] });
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: создать отчёт из шаблона ───────────────────────────────────
  const createFromTemplate = useMutation({
    mutationFn: async (payload: CreateFromTemplatePayload) => {
      const res = await fetch(`/api/projects/${objectId}/reports/from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; data: ReportListItem; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания отчёта из шаблона');
      return json.data;
    },
    onSuccess: () => {
      toast({ title: 'Отчёт из шаблона создан' });
      void qc.invalidateQueries({ queryKey: ['reports', objectId] });
      setCreateFromTemplateOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: создать категорию ───────────────────────────────────────────
  const createCategory = useMutation({
    mutationFn: async (payload: { name: string; parentId?: string }) => {
      const res = await fetch(`/api/projects/${objectId}/reports/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания категории');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['report-categories', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: переименовать категорию ────────────────────────────────────
  const renameCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const res = await fetch(`/api/projects/${objectId}/reports/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка переименования категории');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['report-categories', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // ─── Мутация: удалить категорию ──────────────────────────────────────────
  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await fetch(`/api/projects/${objectId}/reports/categories/${categoryId}`, {
        method: 'DELETE',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления категории');
    },
    onSuccess: (_data, categoryId) => {
      // Если удаляем выбранную категорию — сбросить фильтр
      if (selectedCategoryId === categoryId) setSelectedCategoryId(null);
      void qc.invalidateQueries({ queryKey: ['report-categories', objectId] });
      void qc.invalidateQueries({ queryKey: ['reports', objectId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return {
    // Категории
    categories,
    categoriesLoading,
    createCategory,
    renameCategory,
    deleteCategory,

    // Отчёты
    reports,
    reportsLoading,
    reportsTotal,

    // Выбранная категория
    selectedCategoryId,
    setSelectedCategoryId,

    // Диалоги
    createOpen,
    setCreateOpen,
    createFromTemplateOpen,
    setCreateFromTemplateOpen,

    // Мутации создания
    createReport,
    createFromTemplate,
  };
}
