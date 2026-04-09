'use client';

import { useQuery } from '@tanstack/react-query';

// ── Типы ответа API аналитики ГПР ──────────────────────────────────────────────

export interface SCurvePoint {
  date: string;
  plannedProgress: number;
  actualProgress: number;
}

export interface DeviationItem {
  taskId: string;
  taskName: string;
  plannedDays: number;
  actualDays: number | null;
  deltaStart: number | null;
}

export interface IdReadinessItem {
  taskId: string;
  taskName: string;
  linkedDocsCount: number;
  signedDocsCount: number;
}

export interface CriticalTask {
  id: string;
  name: string;
}

export interface GanttAnalyticsData {
  sCurve: SCurvePoint[];
  deviations: DeviationItem[];
  criticalPath: { tasks: CriticalTask[] };
  idReadiness: IdReadinessItem[];
}

/**
 * Хук загрузки аналитики версии ГПР.
 * startDate / endDate — диапазон для S-кривой (ISO-строки, напр. "2025-01-01").
 * Если не переданы — S-кривая будет пустой.
 */
export function useGanttAnalytics(
  objectId: string,
  versionId: string | null,
  startDate?: string,
  endDate?: string,
) {
  return useQuery<GanttAnalyticsData>({
    queryKey: ['gantt-analytics', objectId, versionId, startDate, endDate],
    queryFn: async () => {
      const url = new URL(
        `/api/objects/${objectId}/gantt-versions/${versionId}/analytics`,
        window.location.origin,
      );
      if (startDate) url.searchParams.set('startDate', startDate);
      if (endDate) url.searchParams.set('endDate', endDate);
      const res = await fetch(url.toString());
      const json = (await res.json()) as { data: GanttAnalyticsData; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки аналитики');
      return json.data;
    },
    enabled: !!objectId && !!versionId,
  });
}
