'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import type { EstimateVersionType, EstimateVersionStatus } from '@prisma/client';
import type { ContractOption, CreateVersionInput } from '@/hooks/useEstimateVersions';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface EstimateListItem {
  id: string;
  name: string;
  versionType: EstimateVersionType;
  status: EstimateVersionStatus;
  isBaseline: boolean;
  isActual: boolean;
  period: string | null;
  totalAmount: number | null;
  totalLabor: number | null;
  totalMat: number | null;
  sourceImportId: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  contract: {
    id: string;
    name: string;
    number: string;
    participants: Array<{ role: string; organization: { name: string } }>;
  };
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
  _count: { chapters: number; childVersions: number };
}

// ─── Хелперы ────────────────────────────────────────────────────────────────

/** Извлечь название организации по роли из участников контракта */
function getParticipantName(item: EstimateListItem, role: string): string {
  const p = item.contract.participants.find((pp) => pp.role === role);
  return p?.organization.name ?? '—';
}

export function getCustomer(item: EstimateListItem): string {
  return getParticipantName(item, 'DEVELOPER');
}

export function getPerformer(item: EstimateListItem): string {
  return getParticipantName(item, 'CONTRACTOR');
}

// ─── Хук ────────────────────────────────────────────────────────────────────

const BASE = (objectId: string, contractId: string) =>
  `/api/objects/${objectId}/contracts/${contractId}/estimate-versions`;

export function useEstimateList(objectId: string, categoryId: string | null) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Список договоров объекта
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractOption[]>({
    queryKey: ['contracts', objectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${objectId}/contracts`);
      const json = await res.json() as { success: boolean; data: ContractOption[] };
      return json.success ? json.data : [];
    },
  });

  // Авто-выбор первого договора
  useEffect(() => {
    if (contracts.length > 0 && selectedContractId === null) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  // Версии смет с расширенными данными
  const { data: versions = [], isLoading: versionsLoading } = useQuery<EstimateListItem[]>({
    queryKey: ['estimate-versions', objectId, selectedContractId, categoryId],
    queryFn: async () => {
      if (!selectedContractId) return [];
      const params = new URLSearchParams();
      if (categoryId) params.set('categoryId', categoryId);
      const url = `${BASE(objectId, selectedContractId)}?${params.toString()}`;
      const res = await fetch(url);
      const json = await res.json() as { success: boolean; data: EstimateListItem[] };
      return json.success ? json.data : [];
    },
    enabled: !!selectedContractId,
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['estimate-versions', objectId, selectedContractId] });
  }, [qc, objectId, selectedContractId]);

  // ─── UI state ─────────────────────────────────────────────────────────────

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === versions.length) return new Set();
      return new Set(versions.map((v) => v.id));
    });
  }, [versions]);

  const allSelected = useMemo(
    () => versions.length > 0 && selectedIds.size === versions.length,
    [versions, selectedIds],
  );
  const someSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < versions.length,
    [versions, selectedIds],
  );

  // Сброс selection при смене контракта/категории
  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedId(null);
  }, [selectedContractId, categoryId]);

  // ─── Мутации ──────────────────────────────────────────────────────────────

  const createVersion = useMutation({
    mutationFn: async (input: CreateVersionInput) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(BASE(objectId, selectedContractId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания версии');
    },
    onSuccess: () => { toast({ title: 'Версия сметы создана' }); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const setActual = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(objectId, selectedContractId)}/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActual: true }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
    },
    onSuccess: () => { toast({ title: 'Версия помечена как актуальная' }); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const setBaseline = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(objectId, selectedContractId)}/${versionId}/set-baseline`, { method: 'POST' });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
    },
    onSuccess: () => { toast({ title: 'Базовая версия установлена' }); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const copyVersion = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(objectId, selectedContractId)}/${versionId}/copy`, { method: 'POST' });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка копирования');
    },
    onSuccess: () => { toast({ title: 'Копия версии создана' }); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const recalculate = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(objectId, selectedContractId)}/${versionId}/recalculate`, { method: 'POST' });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка пересчёта');
    },
    onSuccess: () => { toast({ title: 'Итоги пересчитаны' }); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  const deleteVersion = useMutation({
    mutationFn: async (versionId: string) => {
      if (!selectedContractId) throw new Error('Договор не выбран');
      const res = await fetch(`${BASE(objectId, selectedContractId)}/${versionId}`, { method: 'DELETE' });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка удаления');
    },
    onSuccess: () => { toast({ title: 'Версия удалена' }); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); },
  });

  return {
    // Контракты
    contracts,
    contractsLoading,
    selectedContractId,
    setSelectedContractId,

    // Версии
    versions,
    versionsLoading,

    // UI state
    expandedId,
    toggleExpand,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    allSelected,
    someSelected,

    // Мутации
    createVersion,
    setActual,
    setBaseline,
    copyVersion,
    recalculate,
    deleteVersion,
  };
}
