'use client';

import { useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { ViewerScene } from './ifcSceneSetup';

/** Хук управления видимостью IFC-слоёв в Three.js сцене. */
export function useLayerManager(sceneRef: RefObject<ViewerScene | null>) {
  // layerName → visible
  const [layerVisibility, setLayerVisibility] = useState<Map<string, boolean>>(new Map());

  /** Вызывается после загрузки модели — инициализирует все слои как видимые. */
  const initializeLayers = useCallback(() => {
    const vs = sceneRef.current;
    if (!vs || vs.layers.size === 0) return;
    const initial = new Map<string, boolean>();
    for (const name of Array.from(vs.layers.keys())) {
      initial.set(name, true);
    }
    setLayerVisibility(initial);
  }, [sceneRef]);

  /** Включить / выключить видимость одного слоя и обновить mesh.visible. */
  const setLayerVisible = useCallback((layerName: string, visible: boolean) => {
    const vs = sceneRef.current;
    if (!vs) return;

    const layerGuids = vs.layers.get(layerName);
    if (layerGuids) {
      vs.meshMap.forEach((guid, mesh) => {
        if (layerGuids.has(guid)) {
          (mesh as unknown as { visible: boolean }).visible = visible;
        }
      });
    }

    setLayerVisibility(prev => new Map(prev).set(layerName, visible));
  }, [sceneRef]);

  /** Показать все слои. */
  const showAll = useCallback(() => {
    const vs = sceneRef.current;
    if (!vs) return;
    vs.meshMap.forEach((_guid, mesh) => {
      (mesh as unknown as { visible: boolean }).visible = true;
    });
    setLayerVisibility(prev => {
      const next = new Map(prev);
      for (const k of Array.from(next.keys())) next.set(k, true);
      return next;
    });
  }, [sceneRef]);

  /** Скрыть все слои. */
  const hideAll = useCallback(() => {
    const vs = sceneRef.current;
    if (!vs) return;
    vs.meshMap.forEach((_guid, mesh) => {
      (mesh as unknown as { visible: boolean }).visible = false;
    });
    setLayerVisibility(prev => {
      const next = new Map(prev);
      for (const k of Array.from(next.keys())) next.set(k, false);
      return next;
    });
  }, [sceneRef]);

  return { layerVisibility, initializeLayers, setLayerVisible, showAll, hideAll };
}
