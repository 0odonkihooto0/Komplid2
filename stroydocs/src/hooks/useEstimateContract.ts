'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { EstimateVersionType } from '@prisma/client';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface ContractOption {
  id: string;
  number: string;
  name: string;
}

export interface EstimateVersionSummary {
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
}

interface EstimateContractVersion {
  order: number;
  estimateVersion: EstimateVersionSummary;
}

interface EstimateContractData {
  id: string;
  name: string;
  totalAmount: number | null;
  versions: EstimateContractVersion[];
}

export interface ContractKpi {
  total: number;
  labor: number;
  mat: number;
  overhead: number;
}

// ─── Хук ─────────────────────────────────────────────────────────────────────

const BASE_CONTRACTS = (projectId: string) =>
  `/api/objects/${projectId}/contracts`;

const BASE_VERSIONS = (projectId: string, contractId: string) =>
  `/api/objects/${projectId}/contracts/${contractId}/estimate-versions`;

const BASE_ESTIMATE_CONTRACT = (projectId: string, contractId: string) =>
  `/api/objects/${projectId}/contracts/${contractId}/estimate-contract`;

export function useEstimateContract(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  // Чекбоксы выбранных версий
  const [checkedVersionIds, setCheckedVersionIds] = useState<Set<string>>(new Set());
  // Название сметы контракта
  const [contractName, setContractName] = useState('Смета контракта');

  // Список договоров объекта
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractOption[]>({
    queryKey: ['contracts', projectId],
    queryFn: async () => {
      const res = await fetch(BASE_CONTRACTS(projectId));
      const json = await res.json() as { success: boolean; data: ContractOption[] };
      return json.success ? json.data : [];
    },
  });

  // Установить первый договор по умолчанию
  useEffect(() => {
    if (contracts.length > 0 && selectedContractId === null) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  // Все версии смет по договору
  const { data: allVersions = [], isLoading: versionsLoading } = useQuery<EstimateVersionSummary[]>({
    queryKey: ['estimate-versions', projectId, selectedContractId],
    queryFn: async () => {
      if (!selectedContractId) return [];
      const res = await fetch(BASE_VERSIONS(projectId, selectedContractId));
      const json = await res.json() as { success: boolean; data: EstimateVersionSummary[] };
      return json.success ? json.data : [];
    },
    enabled: !!selectedContractId,
  });

  // Текущая смета контракта (сохранённый состав версий)
  const { data: estimateContract } = useQuery<EstimateContractData | null>({
    queryKey: ['estimate-contract', projectId, selectedContractId],
    queryFn: async () => {
      if (!selectedContractId) return null;
      const res = await fetch(BASE_ESTIMATE_CONTRACT(projectId, selectedContractId));
      const json = await res.json() as { success: boolean; data: EstimateContractData | null };
      return json.success ? json.data : null;
    },
    enabled: !!selectedContractId,
  });

  // Синхронизировать чекбоксы и название при загрузке сохранённой сметы
  useEffect(() => {
    if (estimateContract) {
      const savedIds = new Set(estimateContract.versions.map((v) => v.estimateVersion.id));
      setCheckedVersionIds(savedIds);
      setContractName(estimateContract.name);
    } else {
      setCheckedVersionIds(new Set());
      setContractName('Смета контракта');
    }
  }, [estimateContract]);

  // KPI по выбранным версиям (реактивно, без round-trip к серверу)
  const kpi: ContractKpi = useMemo(() => {
    const selected = allVersions.filter((v) => checkedVersionIds.has(v.id));
    const total = selected.reduce((s, v) => s + (v.totalAmount ?? 0), 0);
    const labor = selected.reduce((s, v) => s + (v.totalLabor ?? 0), 0);
    const mat = selected.reduce((s, v) => s + (v.totalMat ?? 0), 0);
    return { total, labor, mat, overhead: total - labor - mat };
  }, [allVersions, checkedVersionIds]);

  // Переключить чекбокс версии
  const toggleVersion = (versionId: string) => {
    setCheckedVersionIds((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  // Сохранить состав сметы контракта
  const saveContract = useMutation({
    mutationFn: async () => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      if (checkedVersionIds.size === 0) throw new Error('Выберите хотя бы одну версию сметы');
      const res = await fetch(BASE_ESTIMATE_CONTRACT(projectId, selectedContractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: contractName, versionIds: Array.from(checkedVersionIds) }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка сохранения');
    },
    onSuccess: () => {
      toast({ title: 'Смета контракта сохранена' });
      void queryClient.invalidateQueries({ queryKey: ['estimate-contract', projectId, selectedContractId] });
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
    allVersions,
    versionsLoading,
    estimateContract,
    checkedVersionIds,
    toggleVersion,
    contractName,
    setContractName,
    kpi,
    saveContract,
  };
}
