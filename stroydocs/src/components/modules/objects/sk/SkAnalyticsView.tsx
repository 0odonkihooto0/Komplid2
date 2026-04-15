'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SkChartWidget } from './SkChartWidget';
import { SkChartExpandDialog } from './SkChartExpandDialog';
import { useSkAnalytics, type ChartType } from './useSkAnalytics';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION:    'Нарушение ОТ',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY:          'Пожарная безопасность',
  ECOLOGY:              'Экология',
  DOCUMENTATION:        'Документация',
  OTHER:                'Прочее',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN:      'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED:  'Устранён',
  CONFIRMED: 'Подтверждён',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN:        '#ef4444',
  IN_PROGRESS: '#f59e0b',
  RESOLVED:    '#22c55e',
  CONFIRMED:   '#3b82f6',
};

type WidgetKey = 'category' | 'status' | 'author' | 'assignee';

interface Props { objectId: string }

export function SkAnalyticsView({ objectId }: Props) {
  const {
    data, isLoading,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    period, setPeriod,
    overdueOnly, setOverdueOnly,
  } = useSkAnalytics(objectId);

  const [catType,      setCatType]      = useState<ChartType>('pie');
  const [statusType,   setStatusType]   = useState<ChartType>('bar');
  const [authorType,   setAuthorType]   = useState<ChartType>('bar');
  const [assigneeType, setAssigneeType] = useState<ChartType>('bar');

  // Состояние раскрытого виджета (null = нет)
  const [expandedWidget, setExpandedWidget] = useState<WidgetKey | null>(null);

  const categoryData = (data?.byCategory ?? []).map((r) => ({
    name: CATEGORY_LABELS[r.category ?? ''] ?? r.category ?? 'Без категории',
    count: r.count,
  }));

  const statusData = (data?.byStatus ?? []).map((r) => ({
    name:  STATUS_LABELS[r.status] ?? r.status,
    count: r.count,
    color: STATUS_COLORS[r.status],
  }));

  const authorData   = (data?.byAuthor   ?? []).map((r) => ({ name: r.name, count: r.count }));
  const assigneeData = (data?.byAssignee ?? []).map((r) => ({ name: r.name, count: r.count }));

  const summary = data?.summary;

  const kpis = [
    { label: 'Всего дефектов',  value: summary?.totalDefects    ?? 0, icon: AlertTriangle, color: 'text-muted-foreground' },
    { label: 'Открытых',        value: summary?.openDefects     ?? 0, icon: Clock,          color: 'text-yellow-500' },
    { label: 'Просроченных',    value: summary?.overdueDefects  ?? 0, icon: CheckCircle2,   color: 'text-red-500' },
    { label: 'Проверок',        value: summary?.totalInspections ?? 0, icon: Search,        color: 'text-blue-500' },
  ];

  // Конфигурация виджетов для кнопки «Развернуть»
  const widgetConfigs: Record<WidgetKey, {
    title: string;
    data: { name: string; count: number; color?: string }[];
    chartType: ChartType;
    onTypeChange: (t: ChartType) => void;
    showLabels: boolean;
  }> = {
    category: { title: 'Категории недостатков',                  data: categoryData, chartType: catType,      onTypeChange: setCatType,      showLabels: false },
    status:   { title: 'Статусы нарушений',                      data: statusData,   chartType: statusType,   onTypeChange: setStatusType,   showLabels: true },
    author:   { title: 'Авторы СК (топ 10)',                     data: authorData,   chartType: authorType,   onTypeChange: setAuthorType,   showLabels: false },
    assignee: { title: 'Ответственные за устранение (топ 10)',   data: assigneeData, chartType: assigneeType, onTypeChange: setAssigneeType, showLabels: false },
  };

  const expandedConfig = expandedWidget ? widgetConfigs[expandedWidget] : null;

  return (
    <div className="space-y-4">
      {/* Фильтр по периоду + чекбокс просроченных */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Период:</span>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">За всё время</SelectItem>
            <SelectItem value="week">За эту неделю</SelectItem>
            <SelectItem value="month">За текущий месяц</SelectItem>
            <SelectItem value="quarter">За квартал</SelectItem>
          </SelectContent>
        </Select>

        {period === 'all' && (
          <>
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
          </>
        )}

        <div className="flex items-center gap-2 ml-1">
          <Checkbox
            id="sk-overdue-only"
            checked={overdueOnly}
            onCheckedChange={(v) => setOverdueOnly(!!v)}
          />
          <Label htmlFor="sk-overdue-only" className="cursor-pointer text-sm">
            Только просроченные
          </Label>
        </div>
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
          onExpand={() => setExpandedWidget('category')}
        />
        <SkChartWidget
          title="Статусы нарушений"
          data={statusData}
          chartType={statusType}
          onTypeChange={setStatusType}
          showLabels
          onExpand={() => setExpandedWidget('status')}
        />
        <SkChartWidget
          title="Авторы СК (топ 10)"
          data={authorData}
          chartType={authorType}
          onTypeChange={setAuthorType}
          onExpand={() => setExpandedWidget('author')}
        />
        <SkChartWidget
          title="Ответственные за устранение (топ 10)"
          data={assigneeData}
          chartType={assigneeType}
          onTypeChange={setAssigneeType}
          onExpand={() => setExpandedWidget('assignee')}
        />
      </div>

      {/* Модальный развёрнутый виджет */}
      {expandedConfig && (
        <SkChartExpandDialog
          open
          onClose={() => setExpandedWidget(null)}
          title={expandedConfig.title}
          data={expandedConfig.data}
          chartType={expandedConfig.chartType}
          onTypeChange={expandedConfig.onTypeChange}
          showLabels={expandedConfig.showLabels}
        />
      )}
    </div>
  );
}
