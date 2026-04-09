'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ContractStatus, ContractType } from '@prisma/client';

export interface ContractCategory {
  id: string;
  name: string;
  trackPayments: boolean;
  order: number;
  _count: { contracts: number };
}

export interface MgmtContractItem {
  id: string;
  number: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  totalAmount: number | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  ks2Sum: number | null;
  startDate: string | null;
  endDate: string | null;
  _count: { subContracts: number };
}

export function useManagementContracts(projectId: string) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<MgmtContractItem[]>({
    queryKey: ['contracts', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/contracts`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ContractCategory[]>({
    queryKey: ['contract-categories'],
    queryFn: async () => {
      const res = await fetch('/api/contract-categories');
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  // Фильтрация по выбранной категории
  const filteredContracts = useMemo(() => {
    if (!activeCategoryId) return contracts;
    return contracts.filter((c) => c.categoryId === activeCategoryId);
  }, [contracts, activeCategoryId]);

  // Количество договоров по категориям для отображения в сайдбаре
  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contracts) {
      if (c.categoryId) {
        map.set(c.categoryId, (map.get(c.categoryId) ?? 0) + 1);
      }
    }
    return map;
  }, [contracts]);

  return {
    contracts: filteredContracts,
    allContracts: contracts,
    categories,
    isLoading: contractsLoading || categoriesLoading,
    activeCategoryId,
    setActiveCategoryId,
    countByCategory,
  };
}
