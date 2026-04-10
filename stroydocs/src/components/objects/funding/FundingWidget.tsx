'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/format';
import {
  RECORD_TYPE_LABELS,
  BUDGET_KEYS,
  BUDGET_LABELS,
  BUDGET_COLORS,
  type FundingRecord,
  type FundingRecordType,
  type BudgetBreakdown,
} from './useFundingRecords';

interface FundingWidgetProps {
  records: FundingRecord[];
}

type YearFilter = 'all' | number;
type BudgetTypeFilter = 'all' | keyof BudgetBreakdown;

interface TooltipPayload {
  name: string;
  value: number;
  payload: { percent: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const percent = (item.payload.percent * 100).toFixed(1);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground">{formatCurrency(item.value)}</p>
      <p className="text-muted-foreground">{percent}%</p>
    </div>
  );
}

export function FundingWidget({ records }: FundingWidgetProps) {
  const [recordTypeFilter, setRecordTypeFilter] = useState<FundingRecordType>('ALLOCATED');
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
  const [budgetTypeFilter, setBudgetTypeFilter] = useState<BudgetTypeFilter>('all');

  const distinctYears = useMemo(
    () => Array.from(new Set(records.map((r) => r.year))).sort((a, b) => a - b),
    [records]
  );

  // Фильтрация записей по типу и году
  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          r.recordType === recordTypeFilter &&
          (yearFilter === 'all' || r.year === yearFilter)
      ),
    [records, recordTypeFilter, yearFilter]
  );

  // Суммирование по источникам бюджета
  const pieData = useMemo(() => {
    const keysToShow: (keyof BudgetBreakdown)[] =
      budgetTypeFilter === 'all' ? BUDGET_KEYS : [budgetTypeFilter];

    return keysToShow
      .map((key) => ({
        name: BUDGET_LABELS[key],
        value: filtered.reduce((sum, r) => sum + r[key], 0),
        color: BUDGET_COLORS[key],
        key,
      }))
      .filter((d) => d.value > 0);
  }, [filtered, budgetTypeFilter]);

  const totalAmount = useMemo(
    () => pieData.reduce((sum, d) => sum + d.value, 0),
    [pieData]
  );

  const totalBillions = (totalAmount / 1_000_000_000).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={recordTypeFilter}
          onValueChange={(v) => setRecordTypeFilter(v as FundingRecordType)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RECORD_TYPE_LABELS) as FundingRecordType[]).map((key) => (
              <SelectItem key={key} value={key}>{RECORD_TYPE_LABELS[key]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={yearFilter === 'all' ? 'all' : String(yearFilter)}
          onValueChange={(v) => setYearFilter(v === 'all' ? 'all' : Number(v))}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">За всё время</SelectItem>
            {distinctYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={budgetTypeFilter}
          onValueChange={(v) => setBudgetTypeFilter(v as BudgetTypeFilter)}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всего</SelectItem>
            {BUDGET_KEYS.map((key) => (
              <SelectItem key={key} value={key}>{BUDGET_LABELS[key]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pieData.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Нет данных для отображения
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Диаграмма */}
          <div className="relative w-56 h-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  dataKey="value"
                  strokeWidth={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Центральная подпись */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold leading-tight">{totalBillions}</span>
              <span className="text-xs text-muted-foreground">млрд. руб.</span>
            </div>
          </div>

          {/* Легенда */}
          <div className="flex flex-col gap-2 min-w-0">
            {pieData.map((entry) => (
              <div key={entry.key} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate text-muted-foreground">{entry.name}</span>
                <span className="ml-auto pl-4 font-medium whitespace-nowrap">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
