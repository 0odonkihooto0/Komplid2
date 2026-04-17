'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { ViewerScene } from './ifcSceneSetup';

export type ClipAxis = 'horizontal' | 'vertical';

export interface ClipPlane {
  id: string;
  axis: ClipAxis;
  /** Позиция плоскости вдоль оси, 0..100 (процент от bbox сцены). */
  percent: number;
  /** Инвертировать нормаль — отсекается противоположная половина. */
  inverted: boolean;
}

/** Максимум одновременных плоскостей разреза (ЦУС стр. 302). */
export const MAX_CLIP_PLANES = 3;

interface SceneBounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
}

/** Новый id (не криптографический, достаточно для React-ключей). */
function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Хук управления плоскостями сечений (до 3 штук) в Three.js сцене.
 * Использует per-material clipping: `renderer.localClippingEnabled = true`,
 * `material.clippingPlanes = [...]`, `material.clipShadows = true`.
 */
export function useClippingPlanes(sceneRef: RefObject<ViewerScene | null>) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [planes, setPlanes] = useState<ClipPlane[]>([]);
  /** Кэш bbox сцены — вычисляется один раз при первом применении. */
  const boundsRef = useRef<SceneBounds | null>(null);

  const togglePanel = useCallback(() => setPanelOpen(v => !v), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const addPlane = useCallback((axis: ClipAxis) => {
    setPlanes(prev => {
      if (prev.length >= MAX_CLIP_PLANES) return prev;
      return [...prev, { id: newId(), axis, percent: 50, inverted: false }];
    });
  }, []);

  const updatePlane = useCallback((id: string, patch: Partial<Omit<ClipPlane, 'id'>>) => {
    setPlanes(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removePlane = useCallback((id: string) => {
    setPlanes(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearAll = useCallback(() => setPlanes([]), []);

  // Синхронизация Three.js при изменении списка планов.
  useEffect(() => {
    let cancelled = false;

    async function apply() {
      const s = sceneRef.current;
      if (!s) return;
      const THREE = await import('three');
      if (cancelled) return;

      // Один раз вычисляем bbox сцены (модель не меняется в пределах вьюера).
      if (!boundsRef.current) {
        const bbox = new THREE.Box3().setFromObject(s.scene);
        boundsRef.current = {
          minX: bbox.min.x, maxX: bbox.max.x,
          minY: bbox.min.y, maxY: bbox.max.y,
        };
      }
      const b = boundsRef.current;

      // Переключатель глобального флага clipping на уровне рендерера.
      s.renderer.localClippingEnabled = planes.length > 0;
      // Сбрасываем устаревший глобальный массив (используется per-material подход).
      s.renderer.clippingPlanes = [];

      if (planes.length === 0) {
        s.materials.forEach(mat => {
          mat.clippingPlanes = null;
          mat.clipShadows = false;
          mat.needsUpdate = true;
        });
        return;
      }

      const threePlanes = planes.map(p => {
        if (p.axis === 'horizontal') {
          const normal = p.inverted
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(0, -1, 0);
          const y = b.minY + (p.percent / 100) * (b.maxY - b.minY);
          // Для нормали (0, -1, 0) константа = y; для (0, 1, 0) — -y.
          const constant = p.inverted ? -y : y;
          return new THREE.Plane(normal, constant);
        }
        const normal = p.inverted
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(-1, 0, 0);
        const x = b.minX + (p.percent / 100) * (b.maxX - b.minX);
        const constant = p.inverted ? -x : x;
        return new THREE.Plane(normal, constant);
      });

      s.materials.forEach(mat => {
        mat.clippingPlanes = threePlanes;
        mat.clipShadows = true;
        mat.needsUpdate = true;
      });
    }

    void apply();
    return () => { cancelled = true; };
  }, [planes, sceneRef]);

  return {
    panelOpen,
    planes,
    togglePanel,
    closePanel,
    addPlane,
    updatePlane,
    removePlane,
    clearAll,
    /** Подсветка кнопки тулбара. */
    active: panelOpen || planes.length > 0,
  };
}
