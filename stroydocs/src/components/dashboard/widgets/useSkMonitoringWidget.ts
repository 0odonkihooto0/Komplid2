'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// Лейблы категорий дефектов строительного контроля
export const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION:    'Нарушение качества',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY:          'Пожарная безопасность',
  ECOLOGY:              'Экология',
  DOCUMENTATION:        'Нарушения в документации',
  OTHER:                'Прочие',
};

// Лейблы статусов дефектов
export const STATUS_LABELS: Record<string, string> = {
  OPEN:        'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED:    'Устранён',
  CONFIRMED:   'Подтверждён',
  REJECTED:    'Отклонён',
};

// CSS-классы для бейджей статусов
export const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-red-100 text-red-700 border-red-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  RESOLVED:    'bg-blue-100 text-blue-700 border-blue-200',
  CONFIRMED:   'bg-green-100 text-green-700 border-green-200',
  REJECTED:    'bg-gray-100 text-gray-700 border-gray-200',
};

// Палитра цветов для диаграммы
export const COLORS = ['#2563EB', '#059669', '#ef4444', '#7c3aed', '#f59e0b', '#0891b2'];

// Интерфейсы данных
interface SkMonitoringItem {
  category: string;
  closed:   number;
  active:   number;
  pending:  number;
  total:    number;
}

interface DrillDefect {
  id:             string;
  title:          string;
  status:         string;
  category:       string;
  deadline:       string | null;
  resolvedAt:     string | null;
  buildingObject: { id: string; name: string };
  assignee:       { id: string; name: string } | null;
}

interface AnalyticsData {
  skMonitoring: SkMonitoringItem[];
}

// Форматирование даты из ISO в dd.mm.yyyy
export function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('ru-RU', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

interface UseSkMonitoringWidgetOptions {
  objectIds?: string[];
}

export function useSkMonitoringWidget({ objectIds = [] }: UseSkMonitoringWidgetOptions) {
  // Выбранная категория и фильтр статусов для детализации
  const [selected, setSelected] = useState<{ category: string; statuses: string[] } | null>(null);

  // Основной запрос аналитики строительного контроля
  const idsParam = objectIds.map((id) => `objectIds[]=${id}`).join('&');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['dashboard-analytics-sk', objectIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics${idsParam ? `?${idsParam}` : ''}`);
      const json = await res.json() as { success: boolean; data: AnalyticsData; error?: string };
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const skMonitoring = analytics?.skMonitoring ?? [];

  // Запрос детализации — включается только при выбранной категории
  const drillParams = new URLSearchParams();
  if (selected) {
    if (selected.category) drillParams.set('category', selected.category);
    selected.statuses.forEach((s) => drillParams.append('status[]', s));
  }
  objectIds.forEach((id) => drillParams.append('objectIds[]', id));

  const { data: drillItems = [], isLoading: drillLoading } = useQuery<DrillDefect[]>({
    queryKey: ['dashboard-sk-drill', selected?.category, selected?.statuses, objectIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/sk-drill?${drillParams.toString()}`);
      const json = await res.json() as { success: boolean; data: DrillDefect[]; error?: string };
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!selected,
    staleTime: 2 * 60 * 1000,
  });

  // Открыть детализацию по клику на сектор диаграммы (все статусы)
  function selectCategory(category: string) {
    setSelected({ category, statuses: [] });
  }

  // Открыть детализацию по клику на ячейку таблицы (конкретные статусы)
  function selectCell(category: string, statuses: string[]) {
    setSelected({ category, statuses });
  }

  // Данные для pie-диаграммы
  const pieData = skMonitoring.map((s) => ({
    name:     CATEGORY_LABELS[s.category] ?? s.category,
    value:    s.total,
    category: s.category,
  }));

  // Общее количество дефектов
  const totalDefects = skMonitoring.reduce((sum, s) => sum + s.total, 0);

  // Строка итогов для таблицы
  const totalRow = skMonitoring.reduce(
    (acc, s) => ({
      closed:  acc.closed  + s.closed,
      active:  acc.active  + s.active,
      pending: acc.pending + s.pending,
      total:   acc.total   + s.total,
    }),
    { closed: 0, active: 0, pending: 0, total: 0 },
  );

  return {
    skMonitoring,
    isLoading,
    selected,
    setSelected,
    selectCategory,
    selectCell,
    drillItems,
    drillLoading,
    pieData,
    totalDefects,
    totalRow,
  };
}
