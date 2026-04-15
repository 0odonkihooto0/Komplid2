'use client';

import { useState, useCallback } from 'react';
import type { Object3D } from 'three';
import type { ViewerScene } from './ifcSceneSetup';

export type CollisionType = 'intersection' | 'duplicate';

export interface CollisionResult {
  /** IFC GUID первого элемента */
  guidA: string;
  /** IFC GUID второго элемента */
  guidB: string;
  collisionType: CollisionType;
  /** Центр пересечения/дублирования (для отображения) */
  center: { x: number; y: number; z: number };
}

/** Максимальное количество коллизий в результате (защита от OOM) */
const MAX_COLLISIONS = 500;

/**
 * Хук управления обнаружением коллизий в Three.js сцене.
 * Работает только в браузере (вызывается из компонентов с 'use client').
 */
export function useCollisions() {
  const [results, setResults] = useState<CollisionResult[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const detect = useCallback(
    async (scene: ViewerScene, type: CollisionType, toleranceMm: number) => {
      setIsDetecting(true);
      setResults([]);

      try {
        const THREE = await import('three');

        // Сбор всех пар (mesh, guid) из сцены — meshMap: Map<object, string>
        const meshEntries = Array.from(scene.meshMap.entries()) as Array<[object, string]>;

        // Вычисляем ограничивающие боксы для всех mesh
        const boxes: Array<{
          guid: string;
          box: InstanceType<typeof THREE.Box3>;
          center: InstanceType<typeof THREE.Vector3>;
        }> = [];

        for (const [mesh, guid] of meshEntries) {
          const box = new THREE.Box3().setFromObject(mesh as Object3D);
          if (box.isEmpty()) continue;

          const center = new THREE.Vector3();
          box.getCenter(center);

          boxes.push({ guid, box, center });
        }

        // O(n²) перебор пар
        const found: CollisionResult[] = [];
        const toleranceM = toleranceMm / 1000; // мм → метры

        for (let i = 0; i < boxes.length && found.length < MAX_COLLISIONS; i++) {
          for (let j = i + 1; j < boxes.length && found.length < MAX_COLLISIONS; j++) {
            const a = boxes[i];
            const b = boxes[j];

            if (a.guid === b.guid) continue;

            if (type === 'intersection') {
              // Пересечение геометрии: боксы перекрываются
              const expanded = a.box.clone().expandByScalar(toleranceM);
              if (!expanded.intersectsBox(b.box)) continue;
            } else {
              // Дублирование: центры очень близко, одинаковый объём
              const dist = a.center.distanceTo(b.center);
              const sizeA = new THREE.Vector3();
              const sizeB = new THREE.Vector3();
              a.box.getSize(sizeA);
              b.box.getSize(sizeB);
              const volumeA = sizeA.x * sizeA.y * sizeA.z;
              const volumeB = sizeB.x * sizeB.y * sizeB.z;
              const volumeRatio = volumeA > 0 && volumeB > 0 ? Math.min(volumeA, volumeB) / Math.max(volumeA, volumeB) : 0;

              const tol = Math.max(toleranceM, 0.01); // минимум 10мм
              if (dist > tol || volumeRatio < 0.9) continue;
            }

            // Центр коллизии — середина между центрами элементов
            const cx = (a.center.x + b.center.x) / 2;
            const cy = (a.center.y + b.center.y) / 2;
            const cz = (a.center.z + b.center.z) / 2;

            found.push({
              guidA: a.guid,
              guidB: b.guid,
              collisionType: type,
              center: { x: cx, y: cy, z: cz },
            });
          }
        }

        setResults(found);
      } finally {
        setIsDetecting(false);
      }
    },
    []
  );

  const clear = useCallback(() => setResults([]), []);

  return { results, isDetecting, detect, clear };
}
