'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type {
  EstimateAdditionalCostType,
  EstimateAdditionalCostApplicationMode,
  EstimateCalculationMethod,
} from '@prisma/client';
import type { CreateAdditionalCostInput, PatchAdditionalCostInput } from '@/lib/validations/estimate-additional-cost';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface AdditionalCostChapterLink {
  id: string;
  chapterName: string;
}

export interface AdditionalCostEstimateLink {
  id: string;
  version: { id: string; name: string };
}

export interface AdditionalCostItem {
  id: string;
  name: string;
  costType: EstimateAdditionalCostType;
  applicationMode: EstimateAdditionalCostApplicationMode;
  level: number;
  value: string | null;
  constructionWorks: string | null;
  mountingWorks: string | null;
  equipment: string | null;
  other: string | null;
  calculationMethod: EstimateCalculationMethod;
  useCustomPrecision: boolean;
  precision: number | null;
  chapterLinks: AdditionalCostChapterLink[];
  estimateLinks: AdditionalCostEstimateLink[];
}

// ─── Русские названия типов ДЗ ──────────────────────────────────────────────

export const COST_TYPE_LABELS: Record<EstimateAdditionalCostType, string> = {
  ACCRUAL_BY_WORK_TYPE: 'Начисление по видам работ',
  ACCRUAL_TO_TOTALS: 'Начисление на итоги',
  TEMP_BUILDINGS: 'Временные здания',
  WINTER_MARKUP: 'Зимнее удорожание',
  ADDITIONAL_CURRENT_PRICES: 'ДЗ в текущих ценах',
  DEFLATOR_INDEX: 'Индекс-дефлятор',
  MINUS_CUSTOMER_RESOURCES: 'Минус ресурсы заказчика',
  VAT: 'НДС',
};

export const APPLICATION_MODE_LABELS: Record<EstimateAdditionalCostApplicationMode, string> = {
  BY_CHAPTERS: 'По главам',
  BY_ESTIMATES: 'По сметам',
  BY_CHAPTERS_AND_ESTIMATES: 'Объединение',
};

export const CALCULATION_METHOD_LABELS: Record<EstimateCalculationMethod, string> = {
  COEFFICIENT: 'Коэффициент',
  PERCENT: 'Процент',
  FIXED_SUM: 'Фиксированная сумма',
};

// ─── Хук ────────────────────────────────────────────────────────────────────

const BASE = (objectId: string) => `/api/projects/${objectId}/estimate-additional-costs`;

export function useAdditionalCosts(objectId: string) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // UI-стейт диалогов
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<AdditionalCostItem | null>(null);

  // Загрузка общих ДЗ объекта (versionId: null)
  const { data: costs = [], isLoading } = useQuery<AdditionalCostItem[]>({
    queryKey: ['additional-costs', objectId],
    queryFn: async () => {
      const res = await fetch(BASE(objectId));
      const json = await res.json() as { success: boolean; data: AdditionalCostItem[] };
      return json.success ? json.data : [];
    },
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['additional-costs', objectId] });
  }, [qc, objectId]);

  // Создание ДЗ
  const createCost = useMutation({
    mutationFn: async (input: CreateAdditionalCostInput) => {
      const res = await fetch(BASE(objectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания');
    },
    onSuccess: () => {
      toast({ title: 'Дополнительная затрата создана' });
      invalidate();
      setAddDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Обновление ДЗ
  const updateCost = useMutation({
    mutationFn: async ({ costId, data }: { costId: string; data: PatchAdditionalCostInput }) => {
      const res = await fetch(`${BASE(objectId)}/${costId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка обновления');
    },
    onSuccess: () => {
      toast({ title: 'Дополнительная затрата обновлена' });
      invalidate();
      setEditingCost(null);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Удаление ДЗ
  const deleteCost = useMutation({
    mutationFn: async (costId: string) => {
      const res = await fetch(`${BASE(objectId)}/${costId}`, { method: 'DELETE' });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      toast({ title: 'Дополнительная затрата удалена' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return {
    costs,
    isLoading,
    addDialogOpen,
    setAddDialogOpen,
    editingCost,
    setEditingCost,
    createCost,
    updateCost,
    deleteCost,
  };
}
