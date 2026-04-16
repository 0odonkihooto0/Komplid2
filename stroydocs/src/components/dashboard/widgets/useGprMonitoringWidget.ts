'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

/** Структура одного объекта мониторинга ГПР из API */
export interface GprMonitoringItem {
  objectId:  string;
  name:      string;
  planStart: string; // ISO-строка даты после сериализации JSON
  planEnd:   string;
  planPct:   number; // % прошедшего планового срока (0–100)
  factPct:   number; // средний прогресс по всем задачам (0–100)
  delayDays: number; // дней отставания (0 = без отставания)
}

/** Тип верхнего уровня ответа /api/dashboard/analytics */
interface DashboardAnalyticsData {
  gprMonitoring: GprMonitoringItem[];
}

/** Группа светофора */
export type DelayGroup = 'green' | 'yellow' | 'red';

interface UseGprMonitoringWidgetOptions {
  objectIds?: string[];
}

/** Форматирование ISO-даты в формат дд.мм.гггг */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

export function useGprMonitoringWidget({ objectIds = [] }: UseGprMonitoringWidgetOptions) {
  // Выбранная группа светофора: null = диалог закрыт
  const [selectedGroup, setSelectedGroup] = useState<DelayGroup | null>(null);

  // Запрос данных аналитики
  const { data, isLoading } = useQuery<DashboardAnalyticsData>({
    queryKey: ['dashboard-analytics-gpr-monitoring', objectIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      objectIds.forEach((id) => params.append('objectIds[]', id));
      const url = `/api/dashboard/analytics${objectIds.length ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const json = await res.json() as { success: boolean; data: DashboardAnalyticsData; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки мониторинга ГПР');
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const allItems = data?.gprMonitoring ?? [];

  // Разбивка по группам светофора
  const greenItems  = allItems.filter((item) => item.delayDays === 0);
  const yellowItems = allItems.filter((item) => item.delayDays >= 1 && item.delayDays <= 60);
  const redItems    = allItems.filter((item) => item.delayDays > 60);

  // Элементы текущей выбранной группы (показываются в диалоге)
  const filteredItems: GprMonitoringItem[] =
    selectedGroup === 'green'  ? greenItems  :
    selectedGroup === 'yellow' ? yellowItems :
    selectedGroup === 'red'    ? redItems    :
    [];

  return {
    isLoading,
    greenItems,
    yellowItems,
    redItems,
    selectedGroup,
    setSelectedGroup,
    formatDate,
    filteredItems,
  };
}
