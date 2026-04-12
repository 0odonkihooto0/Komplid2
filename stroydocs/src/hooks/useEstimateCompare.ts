'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ContractOption, EstimateVersionItem } from '@/hooks/useEstimateVersions';

// ─── Типы ответа API сравнения (inline, без импорта server-only модулей) ──────

export type CompareMode = 'default' | 'volumes' | 'cost' | 'contract';

export interface EstimateItemSnapshot {
  id: string;
  name: string;
  unit: string | null;
  volume: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  laborCost: number | null;
  materialCost: number | null;
  itemType: string;
}

export interface ChangedItem {
  item1: EstimateItemSnapshot;
  item2: EstimateItemSnapshot;
  changedFields: string[];
}

export interface VersionDiff {
  added: EstimateItemSnapshot[];
  removed: EstimateItemSnapshot[];
  changed: ChangedItem[];
  unchanged: EstimateItemSnapshot[];
}

export interface VersionCompareResult {
  version1: { id: string; name: string; totalAmount: number | null; totalLabor: number | null; totalMat: number | null };
  version2: { id: string; name: string; totalAmount: number | null; totalLabor: number | null; totalMat: number | null };
  diff: VersionDiff;
  summary: { totalDiff: number; laborDiff: number; materialDiff: number };
  formatted?: unknown;
}

// ─── URL builders ─────────────────────────────────────────────────────────────

const urlContracts = (pid: string) => `/api/objects/${pid}/contracts`;
const urlVersions = (pid: string, cid: string) =>
  `/api/objects/${pid}/contracts/${cid}/estimate-versions`;
const urlCompare = (pid: string, cid: string, v1: string, v2: string, mode: CompareMode) =>
  `/api/objects/${pid}/contracts/${cid}/estimate-versions/compare?v1=${v1}&v2=${v2}&mode=${mode}`;

// ─── Хук ─────────────────────────────────────────────────────────────────────

export function useEstimateCompare(projectId: string) {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [v1Id, setV1Id] = useState<string | null>(null);
  const [v2Id, setV2Id] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>('default');
  // compareKey устанавливается нажатием кнопки «Сравнить», сбрасывается при смене версий
  const [compareKey, setCompareKey] = useState<[string, string, CompareMode] | null>(null);

  // Список договоров (shared cache с useEstimateVersions)
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractOption[]>({
    queryKey: ['contracts', projectId],
    queryFn: async () => {
      const res = await fetch(urlContracts(projectId));
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

  // Версии смет по договору (shared cache с useEstimateVersions)
  const { data: versions = [], isLoading: versionsLoading } = useQuery<EstimateVersionItem[]>({
    queryKey: ['estimate-versions', projectId, selectedContractId],
    queryFn: async () => {
      if (!selectedContractId) return [];
      const res = await fetch(urlVersions(projectId, selectedContractId));
      const json = await res.json() as { success: boolean; data: EstimateVersionItem[] };
      return json.success ? json.data : [];
    },
    enabled: !!selectedContractId,
  });

  // Сброс выбора версий и результата при смене договора
  useEffect(() => {
    setV1Id(null);
    setV2Id(null);
    setCompareKey(null);
  }, [selectedContractId]);

  // Результат сравнения (запрос идёт только после нажатия кнопки «Сравнить»)
  const { data: compareResult, isLoading: compareLoading } = useQuery<VersionCompareResult>({
    queryKey: ['estimate-compare', projectId, selectedContractId, compareKey?.[0], compareKey?.[1], compareKey?.[2]],
    queryFn: async () => {
      if (!selectedContractId || !compareKey) throw new Error('Нет параметров');
      const res = await fetch(urlCompare(projectId, selectedContractId, compareKey[0], compareKey[1], compareKey[2]));
      const json = await res.json() as { success: boolean; data: VersionCompareResult; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка сравнения');
      return json.data;
    },
    enabled: !!compareKey && !!selectedContractId,
    staleTime: 30_000,
  });

  const canCompare = !!selectedContractId && !!v1Id && !!v2Id && v1Id !== v2Id;

  const runCompare = () => {
    if (canCompare && v1Id && v2Id) {
      setCompareKey([v1Id, v2Id, compareMode]);
    }
  };

  return {
    contracts,
    contractsLoading,
    selectedContractId,
    setSelectedContractId,
    versions,
    versionsLoading,
    v1Id,
    setV1Id: (id: string | null) => { setV1Id(id); setCompareKey(null); },
    v2Id,
    setV2Id: (id: string | null) => { setV2Id(id); setCompareKey(null); },
    compareMode,
    setCompareMode,
    canCompare,
    runCompare,
    compareResult,
    compareLoading,
  };
}
