'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface CostByContract {
  contractId: string;
  name: string;
  amount: number;
}

export interface PaymentPoint {
  month: string;       // 'YYYY-MM'
  amount: number;
  cumulative: number;
}

export interface StatusItem {
  status: string;
  count: number;
  percent: number;
}

export interface ContractAnalyticsData {
  costByContract: CostByContract[];
  plannedPayments: PaymentPoint[];
  factPayments: PaymentPoint[];
  statusDistribution: StatusItem[];
}

// Дефолтные даты: 1 января текущего года — сегодня
function defaultFrom(): string {
  const d = new Date(new Date().getFullYear(), 0, 1);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDateRangeFilter() {
  const [from, setFrom] = useState<string>(defaultFrom);
  const [to, setTo]     = useState<string>(defaultTo);
  return { from, setFrom, to, setTo };
}

export function useProjectContractAnalytics(objectId: string, from: string, to: string) {
  return useQuery<ContractAnalyticsData>({
    queryKey: ['contract-analytics', objectId, from, to],
    queryFn: async () => {
      const res  = await fetch(`/api/objects/${objectId}/contract-analytics?from=${from}&to=${to}`);
      const json = await res.json() as { success: boolean; data: ContractAnalyticsData; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки аналитики');
      return json.data;
    },
    enabled: !!objectId,
    staleTime: 5 * 60 * 1000,
  });
}

// Форматирование суммы в рублях
export function formatRub(v: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(v);
}

// Форматирование месяца: 'YYYY-MM' → 'Янв 2025'
export function formatMonth(m: string): string {
  const [year, month] = m.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
}
