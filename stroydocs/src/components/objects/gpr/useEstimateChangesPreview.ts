'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type {
  EstimateChangePreviewResult,
  EstimateChangePreviewItem,
} from '@/lib/gantt/estimate-changes-preview';
import { exportEstimateChangesToExcel } from '@/lib/gantt/export-estimate-changes';

interface ContractItem {
  id: string;
  number: string;
  name: string;
}

interface EstimateVersionItem {
  id: string;
  name: string;
  versionType: string;
  _count: { chapters: number };
}

export function useEstimateChangesPreview(objectId: string, versionId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [contractId, setContractId] = useState('');
  const [estimateVersionId, setEstimateVersionId] = useState('');
  const [previewData, setPreviewData] = useState<EstimateChangePreviewResult | null>(null);

  // Загружаем список контрактов объекта
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractItem[]>({
    queryKey: ['contracts-for-preview', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${objectId}/contracts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки договоров');
      const raw = json.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
  });

  // Загружаем версии сметы выбранного контракта
  const { data: estimateVersions = [], isLoading: versionsLoading } = useQuery<EstimateVersionItem[]>({
    queryKey: ['estimate-versions-for-preview', contractId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/contracts/${contractId}/estimate-versions`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки версий сметы');
      const raw = json.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    enabled: !!contractId,
  });

  // Запрос предпросмотра изменений
  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!versionId || !estimateVersionId) throw new Error('Не выбрана версия');
      const res = await fetch(
        `/api/projects/${objectId}/gantt-versions/${versionId}/estimate-changes-preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimateVersionId }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки предпросмотра');
      return json.data as EstimateChangePreviewResult;
    },
    onSuccess: (data) => setPreviewData(data),
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  // Применение изменений (импорт с заменой)
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!versionId || !estimateVersionId) throw new Error('Не выбрана версия');
      const res = await fetch(
        `/api/projects/${objectId}/gantt-versions/${versionId}/import-from-estimate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimateVersionId, replace: true }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка применения изменений');
      return json.data as { imported: boolean; taskCount: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['gantt-versions-project', objectId] });
      toast({ title: `Смета обновлена. Задач: ${data.taskCount}` });
    },
    onError: (err: Error) =>
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  // Экспорт в Excel
  const handleExportExcel = useCallback(async (items: EstimateChangePreviewItem[]) => {
    try {
      const blob = await exportEstimateChangesToExcel(items);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'estimate-changes-preview.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Ошибка экспорта', variant: 'destructive' });
    }
  }, [toast]);

  // Сброс на шаг выбора
  const resetPreview = useCallback(() => setPreviewData(null), []);

  const handleContractChange = useCallback((id: string) => {
    setContractId(id);
    setEstimateVersionId('');
    setPreviewData(null);
  }, []);

  return {
    contractId,
    setContractId: handleContractChange,
    estimateVersionId,
    setEstimateVersionId,
    contracts,
    estimateVersions,
    contractsLoading,
    versionsLoading,
    previewData,
    isPreviewLoading: previewMutation.isPending,
    fetchPreview: previewMutation.mutate,
    isApplying: applyMutation.isPending,
    applyChanges: applyMutation.mutate,
    exportToExcel: handleExportExcel,
    resetPreview,
  };
}
