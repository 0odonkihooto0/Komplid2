'use client';

import { useState, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type * as THREE_NS from 'three';
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { ViewerScene } from './ifcSceneSetup';

interface Measurement {
  id: string;
  pointA: THREE_NS.Vector3;
  pointB: THREE_NS.Vector3;
  /** Расстояние в метрах */
  distance: number;
  line: THREE_NS.Line;
  labelObj: CSS2DObject;
}

/** Хук инструмента измерений расстояний в 3D-сцене. */
export function useMeasurements(sceneRef: RefObject<ViewerScene | null>) {
  const [active, setActive] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  /** Первая выбранная точка — ожидаем вторую */
  const pendingPointRef = useRef<THREE_NS.Vector3 | null>(null);

  /**
   * Обрабатывает клик мыши в режиме измерения.
   * При первом клике запоминает точку A, при втором — создаёт линию и метку.
   * Возвращает true если клик поглощён (не передавать дальше для выбора элемента).
   */
  const handleMeasureClick = useCallback(async (
    e: MouseEvent,
    containerRect: DOMRect,
  ): Promise<boolean> => {
    const s = sceneRef.current;
    if (!s || !active) return false;

    const THREE = await import('three');
    const { CSS2DObject } = await import('three/addons/renderers/CSS2DRenderer.js');

    // Нормализованные координаты устройства (NDC)
    const x = ((e.clientX - containerRect.left) / containerRect.width) * 2 - 1;
    const y = -((e.clientY - containerRect.top) / containerRect.height) * 2 + 1;
    s.raycaster.setFromCamera(new THREE.Vector2(x, y), s.camera);

    const meshes = Array.from(s.meshMap.keys()) as THREE_NS.Object3D[];
    const hits = s.raycaster.intersectObjects(meshes);
    if (!hits.length) return true; // поглотить клик, но точку не фиксировать

    const point = hits[0].point.clone();

    if (!pendingPointRef.current) {
      // Первая точка — запомнить и ждать вторую
      pendingPointRef.current = point;
    } else {
      const pA = pendingPointRef.current;
      const pB = point;
      const dist = pA.distanceTo(pB);

      // Нарисовать линию между точками
      const geo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
      const mat = new THREE.LineBasicMaterial({ color: '#22C55E' });
      const line = new THREE.Line(geo, mat);
      s.scene.add(line);

      // Создать текстовую метку через CSS2DRenderer
      const div = document.createElement('div');
      div.textContent = `${dist.toFixed(2)} м`;
      div.style.cssText = [
        'background:rgba(0,0,0,.75)',
        'color:#fff',
        'padding:2px 8px',
        'border-radius:4px',
        'font-size:12px',
        'white-space:nowrap',
        'pointer-events:none',
        'user-select:none',
      ].join(';');
      const labelObj = new CSS2DObject(div);
      // Расположить метку в середине отрезка
      labelObj.position.copy(pA).lerp(pB, 0.5);
      s.scene.add(labelObj);

      setMeasurements(prev => [
        ...prev,
        { id: crypto.randomUUID(), pointA: pA, pointB: pB, distance: dist, line, labelObj },
      ]);
      pendingPointRef.current = null;
    }
    return true;
  }, [sceneRef, active]);

  /** Удалить все измерения из сцены и сбросить состояние. */
  const clearAll = useCallback(() => {
    const s = sceneRef.current;
    if (s) {
      setMeasurements(prev => {
        prev.forEach(m => {
          s.scene.remove(m.line);
          s.scene.remove(m.labelObj);
        });
        return [];
      });
    }
    pendingPointRef.current = null;
  }, [sceneRef]);

  /** Включить / выключить режим измерений. */
  const toggleActive = useCallback(() => {
    setActive(prev => {
      if (prev) pendingPointRef.current = null; // сбросить незавершённое измерение
      return !prev;
    });
  }, []);

  return { active, measurements, toggleActive, handleMeasureClick, clearAll };
}
