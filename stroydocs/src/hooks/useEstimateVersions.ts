'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { EstimateVersionType } from '@prisma/client';

// Минимальный тип контракта для селектора
export interface ContractOption {
  id: string;
  number: string;
  name: string;
}

// Тип версии сметы из API
export interface EstimateVersionItem {
  id: string;
  name: string;
  versionType: EstimateVersionType;
  isBaseline: boolean;
  isActual: boolean;
  period: string | null;
  totalAmount: number | null;
  totalLabor: number | null;
  totalMat: number | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  _count: { chapters: number };
}

export interface CreateVersionInput {
  name: string;
  versionType: 'ACTUAL' | 'CORRECTIVE';
  period?: string;
}

const BASE = (projectId: string, contractId: string) =>
  `/api/projects/${projectId}/contracts/${contractId}/estimate-versions`;

export function useEstimateVersions(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Выбранный договор — по умолчанию null до загрузки списка
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Список договоров объекта
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractOption[]>({
    queryKey: ['contracts', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contracts`);
      const json = await res.json() as { success: boolean; data: ContractOption[] };
      return json.success ? json.data : [];
    },
  });

  // Установить первый договор по умолчанию после загрузки списка
  useEffect(() => {
    if (contracts.length > 0 && selectedContractId === null) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  // Версии смет по выбранному договору
  const { data: versions = [], isLoading: versionsLoading } = useQuery<EstimateVersionItem[]>({
    queryKey: ['estimate-versions', projectId, selectedContractId],
    queryFn: async () => {
      if (!selectedContractId) return [];
      const res = await fetch(BASE(projectId, selectedContractId));
      const json = await res.json() as { success: boolean; data: EstimateVersionItem[] };
      return json.success ? json.data : [];
    },
    enabled: !!selectedContractId,
  });

  const invalidateVersions = () => {
    void queryClient.invalidateQueries({ queryKey: ['estimate-versions', projectId, selectedContractId] });
  };

  // Создать пустую версию вручную
  const createVersion = useMutation({
    mutationFn: async (input: CreateVersionInput) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(BASE(projectId, selectedContractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания версии');
    },
    onSuccess: () => {
      toast({ title: 'Версия сметы создана' });
      invalidateVersions();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Сделать версию актуальной
  const setActual = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(projectId, selectedContractId)}/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActual: true }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
    },
    onSuccess: () => {
      toast({ title: 'Версия помечена как актуальная' });
      invalidateVersions();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Сделать версию базовой
  const setBaseline = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(projectId, selectedContractId)}/${versionId}/set-baseline`, {
        method: 'POST',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
    },
    onSuccess: () => {
      toast({ title: 'Базовая версия установлена' });
      invalidateVersions();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Создать копию версии
  const copyVersion = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(projectId, selectedContractId)}/${versionId}/copy`, {
        method: 'POST',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка копирования');
    },
    onSuccess: () => {
      toast({ title: 'Копия версии создана' });
      invalidateVersions();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Пересчитать итоги версии
  const recalculate = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(projectId, selectedContractId)}/${versionId}/recalculate`, {
        method: 'POST',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка пересчёта');
    },
    onSuccess: () => {
      toast({ title: 'Итоги пересчитаны' });
      invalidateVersions();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  // Удалить версию
  const deleteVersion = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(projectId, selectedContractId)}/${versionId}`, {
        method: 'DELETE',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => {
      toast({ title: 'Версия удалена' });
      invalidateVersions();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return {
    contracts,
    contractsLoading,
    selectedContractId,
    setSelectedContractId,
    versions,
    versionsLoading,
    createVersion,
    setActual,
    setBaseline,
    copyVersion,
    recalculate,
    deleteVersion,
  };
}
