'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ViewerScene } from './ifcSceneSetup';
import {
  applyDefault,
  applyWireframe,
  applyXRay,
  applyByType,
  type DisplayMode,
} from './displayModes';

interface ElementTypeRow {
  ifcGuid: string;
  ifcType: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Хук управления режимом отображения 3D-модели.
 * Принимает: sceneRef, текущий выбранный элемент, projectId/modelId для фетча типов.
 * Возвращает: текущий режим и setter.
 *
 * Карта guid→ifcType подтягивается ровно один раз при первом входе в режим `byType`.
 */
export function useDisplayModes(
  sceneRef: RefObject<ViewerScene | null>,
  selectedGuid: string | null,
  projectId: string,
  modelId: string,
) {
  const [mode, setMode] = useState<DisplayMode>('default');

  // Карта guid → ifcType для окрашивания по типу. Загружается только при включении byType.
  const { data: typeMap } = useQuery<Map<string, string>>({
    queryKey: ['bim-element-types', projectId, modelId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/bim/models/${modelId}/element-types`,
      );
      const json: ApiResponse<ElementTypeRow[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки типов элементов');
      const map = new Map<string, string>();
      for (const row of json.data) map.set(row.ifcGuid, row.ifcType);
      return map;
    },
    enabled: mode === 'byType' && !!projectId && !!modelId,
    staleTime: 5 * 60_000,
  });

  // Применяем режим при изменении mode / selectedGuid / typeMap
  useEffect(() => {
    const vs = sceneRef.current;
    if (!vs) return;
    // Если ждём загрузку typeMap — не трогаем сцену, чтобы не мелькать дефолтом
    if (mode === 'byType' && !typeMap) return;

    switch (mode) {
      case 'default':
        applyDefault(vs, selectedGuid);
        break;
      case 'wireframe':
        applyWireframe(vs, selectedGuid);
        break;
      case 'xray':
        applyXRay(vs, selectedGuid);
        break;
      case 'byType':
        if (typeMap) applyByType(vs, typeMap, selectedGuid);
        break;
    }
  }, [sceneRef, mode, selectedGuid, typeMap]);

  const setModeCb = useCallback((m: DisplayMode) => setMode(m), []);

  return { mode, setMode: setModeCb, typeMap };
}
