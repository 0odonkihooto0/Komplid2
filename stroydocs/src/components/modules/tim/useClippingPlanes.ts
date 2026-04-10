'use client';

import { useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { ViewerScene } from './ifcSceneSetup';

export type ClipAxis = 'horizontal' | 'vertical';

/** Хук управления плоскостями сечений (clipping planes) в Three.js сцене. */
export function useClippingPlanes(sceneRef: RefObject<ViewerScene | null>) {
  const [active, setActive] = useState(false);
  const [axis, setAxis] = useState<ClipAxis>('horizontal');
  const [value, setValue] = useState(0); // смещение в мировых единицах (метры)

  /** Применить или убрать clipping plane в рендерере. */
  const applyClip = useCallback(async (
    isActive: boolean,
    clipAxis: ClipAxis,
    clipValue: number,
  ) => {
    const s = sceneRef.current;
    if (!s) return;
    if (!isActive) {
      s.renderer.clippingPlanes = [];
      return;
    }
    const THREE = await import('three');
    // Горизонтальный разрез: нормаль вниз (0, -1, 0)
    // Вертикальный разрез: нормаль влево (-1, 0, 0)
    const normal = clipAxis === 'horizontal'
      ? new THREE.Vector3(0, -1, 0)
      : new THREE.Vector3(-1, 0, 0);
    s.renderer.clippingPlanes = [new THREE.Plane(normal, clipValue)];
  }, [sceneRef]);

  /** Включить / выключить режим разреза. */
  const toggle = useCallback(() => {
    setActive(prev => {
      const next = !prev;
      void applyClip(next, axis, value);
      return next;
    });
  }, [applyClip, axis, value]);

  /** Сменить ось разреза (горизонталь / вертикаль). */
  const handleAxisChange = useCallback((a: ClipAxis) => {
    setAxis(a);
    if (active) void applyClip(true, a, value);
  }, [active, applyClip, value]);

  /** Сдвинуть плоскость разреза по слайдеру. */
  const handleValueChange = useCallback((v: number) => {
    setValue(v);
    if (active) void applyClip(true, axis, v);
  }, [active, applyClip, axis]);

  /** Убрать разрез и сбросить состояние. */
  const clear = useCallback(() => {
    setActive(false);
    setAxis('horizontal');
    setValue(0);
    void applyClip(false, 'horizontal', 0);
  }, [applyClip]);

  return { active, axis, value, toggle, handleAxisChange, handleValueChange, clear };
}
