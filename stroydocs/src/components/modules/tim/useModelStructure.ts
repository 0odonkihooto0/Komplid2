'use client';

import { useQuery } from '@tanstack/react-query';

// ─── Типы ───────────────────────────────────────────────────────────────────

export interface StructureElement {
  id: string;
  guid: string;
  name: string | null;
  ifcType: string;
}

export interface StructureLevel {
  label: string;
  elements: StructureElement[];
}

interface ApiElement {
  id: string;
  ifcGuid: string;
  ifcType: string;
  name: string | null;
  level: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ─── Утилиты ────────────────────────────────────────────────────────────────

/** Сортировка уровней: числовые по возрастанию, «Без уровня» последним */
function sortLevels(levels: StructureLevel[]): StructureLevel[] {
  return [...levels].sort((a, b) => {
    if (a.label === 'Без уровня') return 1;
    if (b.label === 'Без уровня') return -1;
    const na = parseFloat(a.label);
    const nb = parseFloat(b.label);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.label.localeCompare(b.label, 'ru');
  });
}

// ─── Хук ────────────────────────────────────────────────────────────────────

/**
 * Загружает элементы модели из БД и группирует по уровню (level).
 * Используется в панели «Структура модели».
 */
export function useModelStructure(projectId: string, modelId: string) {
  return useQuery<StructureLevel[]>({
    queryKey: ['bim-model-structure', projectId, modelId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/bim/models/${modelId}/elements?limit=200`
      );
      const json: ApiResponse<ApiElement[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки элементов');

      // Группировка по level
      const byLevel = new Map<string, StructureElement[]>();
      for (const el of json.data) {
        const key = el.level ?? 'Без уровня';
        const arr = byLevel.get(key) ?? [];
        arr.push({ id: el.id, guid: el.ifcGuid, name: el.name, ifcType: el.ifcType });
        byLevel.set(key, arr);
      }

      const levels: StructureLevel[] = Array.from(byLevel.entries()).map(([label, elements]) => ({
        label,
        elements,
      }));

      return sortLevels(levels);
    },
    staleTime: 60_000,
    enabled: !!projectId && !!modelId,
  });
}
