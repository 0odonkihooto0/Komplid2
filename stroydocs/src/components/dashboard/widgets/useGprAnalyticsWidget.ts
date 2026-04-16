'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

/** Структура одной точки из buildGprMonthly (DASH.1 API) */
interface GprMonthlyItem {
  month: string;        // "2024-01"
  plan: number;         // плановая стоимость, ₽
  factExec: number;     // факт выполнения (прогресс × сумма), ₽
  deviationExec: number;// план − факт выполнения (может быть < 0)
  factOsv: number;      // факт освоения (акты ПИР / КС-2), ₽
  deviationOsv: number; // план − факт освоения
}

/** Тип данных, которые приходят из API */
interface DashboardAnalyticsData {
  gprPirAnalytics: GprMonthlyItem[];
  gprSmrAnalytics: GprMonthlyItem[];
}

/** Точка данных для Recharts — добавляем отформатированный label */
export interface ChartPoint extends GprMonthlyItem {
  label: string; // "Янв 2024"
}

type Stage  = 'PIR' | 'SMR';
type Period = 'quarter' | 'halfyear' | 'year';
type Mode   = 'separate' | 'cumulative';

const MONTH_LABELS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

/** "2024-01" → "Янв 2024" */
function formatMonth(key: string): string {
  const [yr, m] = key.split('-');
  return `${MONTH_LABELS[parseInt(m, 10) - 1] ?? m} ${yr}`;
}

/** Форматирование суммы: 1 200 000 → "1.2М ₽", 540 000 → "540К ₽" */
export function fmtAmount(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}М ₽`;
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(0)}К ₽`;
  return `${v} ₽`;
}

/** Накопительный пересчёт: каждое значение = сумма всех предыдущих + текущее */
function applyCumulative(items: GprMonthlyItem[]): GprMonthlyItem[] {
  let cp = 0, ce = 0, co = 0;
  return items.map((d) => {
    cp += d.plan; ce += d.factExec; co += d.factOsv;
    return { ...d, plan: cp, factExec: ce, deviationExec: cp - ce, factOsv: co, deviationOsv: cp - co };
  });
}

interface UseGprAnalyticsWidgetOptions {
  stage: Stage;
  objectIds?: string[];
}

export function useGprAnalyticsWidget({ stage, objectIds = [] }: UseGprAnalyticsWidgetOptions) {
  const currentYear = String(new Date().getFullYear());

  // ─── Состояние фильтров ──────────────────────────────────────────────────
  const [year, setYear]           = useState(currentYear);
  const [dateFrom, setDateFrom]   = useState<string | undefined>(undefined);
  const [dateTo, setDateTo]       = useState<string | undefined>(undefined);
  const [period, setPeriod]       = useState<Period>('year');
  const [mode, setMode]           = useState<Mode>('separate');
  // Скрытые линии: Set с dataKey строками
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

  const toggleLine = useCallback((key: string) => {
    setHiddenLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ─── Формирование query-параметров ──────────────────────────────────────
  const params = new URLSearchParams({ year, period });
  objectIds.forEach((id) => params.append('objectIds[]', id));
  // Произвольный период имеет приоритет над year+period
  if (dateFrom && dateTo) {
    params.set('dateFrom', dateFrom);
    params.set('dateTo', dateTo);
  }

  // ─── Запрос данных ───────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<DashboardAnalyticsData>({
    queryKey: ['dashboard-analytics-gpr', stage, objectIds, year, dateFrom, dateTo, period],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics?${params.toString()}`);
      const json = await res.json() as { success: boolean; data: DashboardAnalyticsData; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки аналитики ГПР');
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── Подготовка данных для графика ──────────────────────────────────────
  const raw = stage === 'PIR'
    ? (data?.gprPirAnalytics ?? [])
    : (data?.gprSmrAnalytics ?? []);

  const processed = mode === 'cumulative' ? applyCumulative(raw) : raw;

  const chartData: ChartPoint[] = processed.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return {
    chartData,
    isLoading,
    hiddenLines,
    toggleLine,
    year, setYear,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    period, setPeriod,
    mode, setMode,
  };
}
