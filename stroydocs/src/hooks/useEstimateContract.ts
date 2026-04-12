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

/** Позиция сметы в иерархии для таблицы контракта */
export interface ContractItem {
  id: string;
  sortOrder: number | null;
  code: string | null;
  name: string;
  unit: string | null;
  volume: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  laborCost: number | null;
  versionName: string;
}

/** Раздел сметы контракта (глава из версии) */
export interface ContractSection {
  id: string;
  code: string | null;
  name: string;
  totalAmount: number | null;
  items: ContractItem[];
  versionName: string;
}

export interface ContractKpi {
  total: number;
  labor: number;
  mat: number;
  overhead: number;
}

export interface CreateContractInput {
  name: string;
  period?: string;
  chapter?: string;
}

// ─── Хук ─────────────────────────────────────────────────────────────────────

const BASE_CONTRACTS = (pid: string) => `/api/objects/${pid}/contracts`;
const BASE_VERSIONS = (pid: string, cid: string) => `/api/objects/${pid}/contracts/${cid}/estimate-versions`;
const BASE_ESTIMATE_CONTRACT = (pid: string, cid: string) => `/api/objects/${pid}/contracts/${cid}/estimate-contract`;

export function useEstimateContract(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [checkedVersionIds, setCheckedVersionIds] = useState<Set<string>>(new Set());
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

  // Текущая смета контракта
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

  // Синхронизировать чекбоксы и название при загрузке
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

  // Иерархические данные по выбранным версиям (разделы + позиции)
  const { data: sectionsData = [] } = useQuery<ContractSection[]>({
    queryKey: ['contract-sections', projectId, selectedContractId, Array.from(checkedVersionIds).sort().join(',')],
    queryFn: async () => {
      if (!selectedContractId || checkedVersionIds.size === 0) return [];
      const sections: ContractSection[] = [];
      const ids = Array.from(checkedVersionIds);
      // Загружаем данные каждой выбранной версии
      const results = await Promise.all(
        ids.map(async (vid) => {
          const res = await fetch(`${BASE_VERSIONS(projectId, selectedContractId)}/${vid}`);
          const json = await res.json() as { success: boolean; data: { name: string; chapters: Array<{ id: string; code: string | null; name: string; totalAmount: number | null; items: Array<ContractItem> }> } };
          return json.success ? json.data : null;
        })
      );
      for (const vData of results) {
        if (!vData) continue;
        for (const ch of vData.chapters) {
          sections.push({
            id: ch.id,
            code: ch.code,
            name: ch.name,
            totalAmount: ch.totalAmount,
            items: (ch.items ?? []).map((item) => ({ ...item, versionName: vData.name })),
            versionName: vData.name,
          });
        }
      }
      return sections;
    },
    enabled: !!selectedContractId && checkedVersionIds.size > 0,
    staleTime: 30_000,
  });

  // KPI по выбранным версиям
  const kpi: ContractKpi = useMemo(() => {
    const selected = allVersions.filter((v) => checkedVersionIds.has(v.id));
    const total = selected.reduce((s, v) => s + (v.totalAmount ?? 0), 0);
    const labor = selected.reduce((s, v) => s + (v.totalLabor ?? 0), 0);
    const mat = selected.reduce((s, v) => s + (v.totalMat ?? 0), 0);
    return { total, labor, mat, overhead: total - labor - mat };
  }, [allVersions, checkedVersionIds]);

  const toggleVersion = (versionId: string) => {
    setCheckedVersionIds((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) next.delete(versionId);
      else next.add(versionId);
      return next;
    });
  };

  // Сохранить смету контракта
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

  // Создать смету контракта
  const createContract = useMutation({
    mutationFn: async (input: CreateContractInput) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(BASE_ESTIMATE_CONTRACT(projectId, selectedContractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input.name, period: input.period, versionIds: [] }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания');
    },
    onSuccess: () => {
      toast({ title: 'Смета контракта создана' });
      void queryClient.invalidateQueries({ queryKey: ['estimate-contract', projectId, selectedContractId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return {
    contracts, contractsLoading,
    selectedContractId, setSelectedContractId,
    allVersions, versionsLoading,
    estimateContract,
    checkedVersionIds, toggleVersion,
    contractName, setContractName,
    sections: sectionsData,
    kpi,
    saveContract,
    createContract,
  };
}
