'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { EstimateItemDetail } from '@/hooks/useEstimateTree';

// ─── Типы ───────────────────────────────────────────────────────────────────

export interface ItemEditData {
  name?: string;
  code?: string;
  unit?: string;
  volume?: number;
  unitPrice?: number;
  laborCost?: number;
  materialCost?: number;
  machineryCost?: number;
  priceIndex?: number;
  overhead?: number;
  profit?: number;
}

// ─── Хук ────────────────────────────────────────────────────────────────────

interface UseEstimateItemEditParams {
  projectId: string;
  contractId: string;
  versionId: string;
}

/** Хук для диалога редактирования позиции сметы */
export function useEstimateItemEdit({
  projectId,
  contractId,
  versionId,
}: UseEstimateItemEditParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseUrl = `/api/projects/${projectId}/contracts/${contractId}/estimate-versions/${versionId}`;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['estimate-version', versionId] });
  };

  // Сохранить изменения позиции
  const saveItem = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: ItemEditData }) => {
      const res = await fetch(`${baseUrl}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка сохранения позиции');
    },
    onSuccess: () => {
      toast({ title: 'Позиция сохранена' });
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Извлечь начальные значения формы из позиции
  const getDefaults = (item: EstimateItemDetail): ItemEditData => ({
    name: item.name,
    code: item.code ?? undefined,
    unit: item.unit ?? undefined,
    volume: item.volume ?? undefined,
    unitPrice: item.unitPrice ?? undefined,
    laborCost: item.laborCost ?? undefined,
    materialCost: item.materialCost ?? undefined,
    machineryCost: item.machineryCost ?? undefined,
    priceIndex: item.priceIndex ?? undefined,
    overhead: item.overhead ?? undefined,
    profit: item.profit ?? undefined,
  });

  return {
    saveItem,
    getDefaults,
  };
}
