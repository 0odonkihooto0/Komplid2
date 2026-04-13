'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/utils/format';
import type { GanttAnalyticsData } from './useGanttAnalytics';

interface Props {
  data: GanttAnalyticsData;
  reportDate: string;
  onReportDateChange: (d: string) => void;
}

/** Цвет для отклонений: отрицательное — красный, 0 — серый, положительное — зелёный */
function varianceColor(value: number): string {
  if (value < 0) return 'text-red-600';
  if (value > 0) return 'text-green-600';
  return 'text-muted-foreground';
}

/** Цвет для индексов: <1 — красный, =1 — серый, >1 — зелёный */
function indexColor(value: number | null): string {
  if (value === null) return 'text-muted-foreground';
  if (value < 0.99) return 'text-red-600';
  if (value > 1.01) return 'text-green-600';
  return 'text-muted-foreground';
}

function MetricRow({ label, value, desc }: { label: string; value: string; desc?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="text-xs text-muted-foreground truncate" title={desc}>{label}</span>
      <span className="text-sm font-medium tabular-nums whitespace-nowrap">{value}</span>
    </div>
  );
}

function ColoredMetricRow({
  label, value, colorClass, desc,
}: { label: string; value: string; colorClass: string; desc?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="text-xs text-muted-foreground truncate" title={desc}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${colorClass}`}>{value}</span>
    </div>
  );
}

export function GanttEvmPanel({ data, reportDate, onReportDateChange }: Props) {
  return (
    <div className="space-y-3">
      {/* Дата среза */}
      <div className="flex items-center gap-2">
        <Label htmlFor="evm-date" className="text-xs whitespace-nowrap">Дата</Label>
        <Input
          id="evm-date"
          type="date"
          className="h-8 w-40 text-xs"
          value={reportDate}
          onChange={(e) => onReportDateChange(e.target.value)}
        />
      </div>

      {/* Блок 1 — Проценты */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold">Выполнение</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 divide-y">
          <MetricRow label="Плановое" value={`${data.planPercent}%`} desc="Planned Value %" />
          <MetricRow label="Фактическое" value={`${data.factPercent}%`} desc="Earned Value %" />
          <MetricRow label="Прогнозное" value={`${data.forecastPercent}%`} desc="Forecast %" />
          <ColoredMetricRow
            label="Отклонение"
            value={`${data.deviationPercent > 0 ? '+' : ''}${data.deviationPercent}%`}
            colorClass={varianceColor(-data.deviationPercent)}
            desc="Plan % − Forecast %"
          />
        </CardContent>
      </Card>

      {/* Блок 2 — EVM абсолютные */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold">EVM показатели</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 divide-y">
          <MetricRow label="EV — Освоенный объём" value={formatCurrency(data.ev)} desc="Earned Value" />
          <MetricRow label="AC — Фактические затраты" value={formatCurrency(data.ac)} desc="Actual Cost" />
          <MetricRow label="PV — Плановый объём" value={formatCurrency(data.pv)} desc="Planned Value" />
          <MetricRow label="BAC — Бюджет при завершении" value={formatCurrency(data.bac)} desc="Budget At Completion" />
          <MetricRow label="SAC — Дата завершения" value={data.sac ?? '—'} desc="Scheduled At Completion" />
          <MetricRow label="TAC — Плановая длительность" value={`${data.tac} дн.`} desc="Time At Completion" />
          <MetricRow label="AT — Фактическое время" value={`${data.at} дн.`} desc="Actual Time" />
        </CardContent>
      </Card>

      {/* Блок 3 — Отклонения */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold">Отклонения</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 divide-y">
          <ColoredMetricRow
            label="CV — По стоимости"
            value={formatCurrency(data.cv)}
            colorClass={varianceColor(data.cv)}
            desc="Cost Variance = EV − AC"
          />
          <ColoredMetricRow
            label="SV — По срокам"
            value={formatCurrency(data.sv)}
            colorClass={varianceColor(data.sv)}
            desc="Schedule Variance = EV − PV"
          />
          <ColoredMetricRow
            label="TV — Временное"
            value={`${data.tv > 0 ? '+' : ''}${Math.round(data.tv)} дн.`}
            colorClass={varianceColor(data.tv)}
            desc="Time Variance (дни)"
          />
        </CardContent>
      </Card>

      {/* Блок 4 — Индексы */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold">Индексы</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 divide-y">
          <ColoredMetricRow
            label="CPI — Индекс стоимости"
            value={data.cpi !== null ? data.cpi.toFixed(2) : '—'}
            colorClass={indexColor(data.cpi)}
            desc="Cost Performance Index = EV / AC"
          />
          <ColoredMetricRow
            label="SPI — Индекс сроков"
            value={data.spi !== null ? data.spi.toFixed(2) : '—'}
            colorClass={indexColor(data.spi)}
            desc="Schedule Performance Index = EV / PV"
          />
        </CardContent>
      </Card>
    </div>
  );
}
