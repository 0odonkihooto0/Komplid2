'use client';

import { useQuery } from '@tanstack/react-query';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface MasteringMonth {
  /** Формат: "2025-01" */
  month: string;
  planAmount: number;
  factAmount: number;
  taskCount: number;
}

export interface MasteringData {
  months: MasteringMonth[];
  totalPlan: number;
  totalFact: number;
}

// ── Хук ───────────────────────────────────────────────────────────────────────

/**
 * Загружает помесячный план освоения средств для выбранной версии ГПР.
 * factAmount = 0 в MVP (интеграция с КС-2 — следующий этап).
 */
export function useGanttMastering(
  objectId: string,
  versionId: string | null,
  year: number,
) {
  return useQuery<MasteringData>({
    queryKey: ['gantt-mastering', objectId, versionId, year],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${objectId}/gantt-versions/${versionId}/mastering?year=${year}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки плана освоения');
      return json.data as MasteringData;
    },
    enabled: !!objectId && !!versionId,
  });
}
