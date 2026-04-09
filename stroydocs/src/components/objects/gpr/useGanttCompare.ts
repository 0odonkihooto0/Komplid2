'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { VersionDiff } from '@/lib/gantt/compare-versions';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface CompareResult {
  v1: { id: string; name: string };
  v2: { id: string; name: string };
  diff: VersionDiff;
}

// ── Хук сравнения версий ГПР ──────────────────────────────────────────────────

/**
 * Управляет состоянием выбора двух версий и запросом сравнения.
 * Запрос выполняется только после явного вызова triggerCompare().
 */
export function useGanttCompare(objectId: string) {
  const [v1Id, setV1Id] = useState<string | null>(null);
  const [v2Id, setV2Id] = useState<string | null>(null);
  // compareKey > 0 означает что пользователь нажал "Сравнить"
  const [compareKey, setCompareKey] = useState(0);

  const { data, isLoading, error } = useQuery<CompareResult>({
    queryKey: ['gantt-compare', objectId, v1Id, v2Id, compareKey],
    queryFn: async () => {
      const url = `/api/projects/${objectId}/gantt-versions/compare?v1=${v1Id}&v2=${v2Id}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ошибка сравнения версий');
      return json.data as CompareResult;
    },
    // Запрос активен только когда выбраны обе версии и нажата кнопка "Сравнить"
    enabled: !!v1Id && !!v2Id && compareKey > 0,
  });

  return {
    v1Id,
    setV1Id,
    v2Id,
    setV2Id,
    result: data ?? null,
    isLoading,
    error: error as Error | null,
    canCompare: !!v1Id && !!v2Id && v1Id !== v2Id,
    triggerCompare: () => setCompareKey((k) => k + 1),
  };
}
