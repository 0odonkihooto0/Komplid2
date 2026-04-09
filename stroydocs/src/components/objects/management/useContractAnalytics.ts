import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────

export interface CategoryAmount {
  name: string;
  amount: number;
  count: number;
}

export interface MonthAmount {
  month: string; // 'YYYY-MM'
  amount: number;
}

export interface PlanVsFact {
  month: string;
  plan: number;
  fact: number;
}

export interface ContractStatusRow {
  status: string;
  count: number;
  amount: number;
}

export interface OverdueKs2 {
  count: number;
  totalAmount: number;
  items: { id: string; status: string; periodEnd: string }[];
}

export interface ManagementAnalyticsData {
  projectId: string;
  year: number;
  contractsByCategory: CategoryAmount[];
  planPaymentsChart: MonthAmount[];
  planVsFactChart: PlanVsFact[];
  contractStatuses: ContractStatusRow[];
  overdueKs2: OverdueKs2;
}

// ─────────────────────────────────────────────
// Форматирование
// ─────────────────────────────────────────────

export function formatRub(v: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(v);
}

// ─────────────────────────────────────────────
// Накопительный итог
// ─────────────────────────────────────────────

export function toCumulativeAmount(data: MonthAmount[]): MonthAmount[] {
  let acc = 0;
  return data.map((item) => {
    acc += item.amount;
    return { ...item, amount: acc };
  });
}

export function toCumulativePlanVsFact(data: PlanVsFact[]): PlanVsFact[] {
  let planAcc = 0;
  let factAcc = 0;
  return data.map((item) => {
    planAcc += item.plan;
    factAcc += item.fact;
    return { ...item, plan: planAcc, fact: factAcc };
  });
}

// ─────────────────────────────────────────────
// Хук аналитики управления проектом
// ─────────────────────────────────────────────

export function useContractAnalytics(projectId: string, year: number) {
  return useQuery<ManagementAnalyticsData>({
    queryKey: ['management-analytics', projectId, year],
    queryFn: async () => {
      const res = await fetch(
        `/api/objects/${projectId}/management-analytics?year=${year}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки аналитики');
      return json.data as ManagementAnalyticsData;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────
// Хук управления фильтрами
// ─────────────────────────────────────────────

export function useAnalyticsFilters() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [cumulative, setCumulative] = useState(false);

  const yearOptions = [
    { value: currentYear, label: String(currentYear) },
    { value: currentYear - 1, label: String(currentYear - 1) },
    { value: currentYear - 2, label: String(currentYear - 2) },
  ];

  return { year, setYear, cumulative, setCumulative, yearOptions };
}
