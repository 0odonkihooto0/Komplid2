'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Clock, Search } from 'lucide-react';
import { SkChartWidget } from './SkChartWidget';
import { useSkAnalytics, type ChartType } from './useSkAnalytics';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION: 'Нарушение ОТ',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY: 'Пожарная безопасность',
  ECOLOGY: 'Экология',
  DOCUMENTATION: 'Документация',
  OTHER: 'Прочее',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Устранён',
  CONFIRMED: 'Подтверждён',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#ef4444',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#22c55e',
  CONFIRMED: '#3b82f6',
};

interface Props { objectId: string }

export function SkAnalyticsView({ objectId }: Props) {
  const { data, isLoading, dateFrom, setDateFrom, dateTo, setDateTo } = useSkAnalytics(objectId);

  const [catType, setCatType] = useState<ChartType>('pie');
  const [statusType, setStatusType] = useState<ChartType>('bar');
  const [authorType, setAuthorType] = useState<ChartType>('bar');
  const [assigneeType, setAssigneeType] = useState<ChartType>('bar');

  const categoryData = (data?.byCategory ?? []).map((r) => ({
    name: CATEGORY_LABELS[r.category ?? ''] ?? r.category ?? 'Без категории',
    count: r.count,
  }));

  const statusData = (data?.byStatus ?? []).map((r) => ({
    name: STATUS_LABELS[r.status] ?? r.status,
    count: r.count,
    color: STATUS_COLORS[r.status],
  }));

  const authorData = (data?.byAuthor ?? []).map((r) => ({ name: r.name, count: r.count }));
  const assigneeData = (data?.byAssignee ?? []).map((r) => ({ name: r.name, count: r.count }));

  const summary = data?.summary;

  const kpis = [
    { label: 'Всего дефектов',   value: summary?.totalDefects ?? 0,   icon: AlertTriangle, color: 'text-muted-foreground' },
    { label: 'Открытых',         value: summary?.openDefects ?? 0,     icon: Clock,         color: 'text-yellow-500' },
    { label: 'Просроченных',     value: summary?.overdueDefects ?? 0,  icon: CheckCircle2,  color: 'text-red-500' },
    { label: 'Проверок',         value: summary?.totalInspections ?? 0, icon: Search,       color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Фильтр по периоду */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Период:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border px-2 py-1 text-sm"
        />
        <span className="text-sm text-muted-foreground">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border px-2 py-1 text-sm"
        />
      </div>

      {/* KPI-плашки */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex flex-col items-center py-3 px-2 text-center">
              <kpi.icon className={`mb-1 h-5 w-5 ${kpi.color}`} />
              <p className="text-2xl font-bold">{isLoading ? '—' : kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4 графика */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkChartWidget
          title="Категории недостатков"
          data={categoryData}
          chartType={catType}
          onTypeChange={setCatType}
        />
        <SkChartWidget
          title="Статусы нарушений"
          data={statusData}
          chartType={statusType}
          onTypeChange={setStatusType}
        />
        <SkChartWidget
          title="Авторы СК (топ 10)"
          data={authorData}
          chartType={authorType}
          onTypeChange={setAuthorType}
        />
        <SkChartWidget
          title="Ответственные за устранение (топ 10)"
          data={assigneeData}
          chartType={assigneeType}
          onTypeChange={setAssigneeType}
        />
      </div>
    </div>
  );
}
