'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Vector2 } from 'three';
import { Loader2 } from 'lucide-react';
import { ViewerToolbar } from './ViewerToolbar';
import { initScene, loadIfcModel } from './ifcSceneSetup';
import type { ViewerScene } from './ifcSceneSetup';

const DEFAULT_COLOR = '#9CA3AF';
const SELECTED_COLOR = '#60A5FA';

interface Props {
  downloadUrl: string;
  elementColors?: Map<string, string>;
  onElementSelected: (ifcGuid: string | null) => void;
  /** Вызывается когда модель загружена и сцена готова */
  onSceneReady?: (scene: ViewerScene) => void;
  /** Показывать кнопку коллизий в toolbar */
  onCollisions?: () => void;
  /** Показывать кнопку сравнения в toolbar */
  onCompare?: () => void;
  collisionsActive?: boolean;
  compareActive?: boolean;
}

export function IfcViewerCore({
  downloadUrl,
  elementColors,
  onElementSelected,
  onSceneReady,
  onCollisions,
  onCompare,
  collisionsActive,
  compareActive,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  // Стабильный ref для коллбека — не вызывает пересоздание viewer
  const onSelectedRef = useRef(onElementSelected);
  onSelectedRef.current = onElementSelected;
  const onSceneReadyRef = useRef(onSceneReady);
  onSceneReadyRef.current = onSceneReady;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wireframe, setWireframe] = useState(false);

  // ─── Toolbar-коллбеки ────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.camera.position.set(30, 30, 30);
    s.controls.target.set(0, 0, 0);
    s.controls.update();
  }, []);

  const handleFit = useCallback(async () => {
    const s = sceneRef.current;
    if (!s) return;
    const { Box3, Vector3 } = await import('three');
    const box = new Box3().setFromObject(s.scene);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    s.camera.position.copy(center).addScalar(Math.max(size.x, size.y, size.z) * 1.5);
    s.controls.target.copy(center);
    s.controls.update();
  }, []);

  const handleWireframe = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.wireframe = !s.wireframe;
    s.materials.forEach(mat => { mat.wireframe = s.wireframe; });
    setWireframe(s.wireframe);
  }, []);

  // ─── Инициализация сцены + загрузка IFC ─────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      setLoadError(null);

      const vs = await initScene(container!);
      if (cancelled) { vs.renderer.dispose(); return; }
      sceneRef.current = vs;

      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: не удалось скачать IFC`);
        const buffer = new Uint8Array(await res.arrayBuffer());
        const { IfcAPI } = await import('web-ifc');
        const ifcApi = new IfcAPI();
        ifcApi.SetWasmPath('/');
        await ifcApi.Init();
        await loadIfcModel(ifcApi, buffer, vs);
        // Уведомить внешний код что сцена и элементы готовы
        if (!cancelled) onSceneReadyRef.current?.(vs);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки IFC');
      }

      if (!cancelled) setLoading(false);
    }

    init().catch(err => {
      if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Ошибка инициализации');
      setLoading(false);
    });

    // Клик → raycasting → выбор элемента
    function onClick(e: MouseEvent) {
      const s = sceneRef.current;
      if (!s || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      s.raycaster.setFromCamera(new Vector2(x, y), s.camera);
      const meshes = Array.from(s.meshMap.keys()).filter(
        (o): o is import('three').Object3D => typeof o === 'object' && o !== null && 'isObject3D' in o
      );
      const hits = s.raycaster.intersectObjects(meshes);
      if (!hits.length) { onSelectedRef.current(null); return; }
      const expressID = s.meshMap.get(hits[0].object);
      const guid = expressID !== undefined ? s.guidMap.get(expressID) ?? null : null;
      onSelectedRef.current(guid);
      // Подсветить выбранный элемент
      s.materials.forEach((mat, id) => {
        mat.color.set(id === expressID ? SELECTED_COLOR : DEFAULT_COLOR);
      });
    }

    function onResize() {
      const s = sceneRef.current;
      if (!s || !containerRef.current) return;
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      s.renderer.setSize(w, h);
    }

    container.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      const s = sceneRef.current;
      if (s) {
        cancelAnimationFrame(s.frameId);
        s.renderer.dispose();
        if (container.contains(s.renderer.domElement)) container.removeChild(s.renderer.domElement);
      }
      sceneRef.current = null;
    };
    // Пересоздаём только при смене downloadUrl — коллбек стабилизирован через ref
  }, [downloadUrl]);

  // ─── Цветовая карта элементов ────────────────────────────────────────────────
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !elementColors) return;
    s.materials.forEach((mat, expressID) => {
      const guid = s.guidMap.get(expressID);
      const color = guid !== undefined ? elementColors.get(guid) : undefined;
      mat.color.set(color ?? DEFAULT_COLOR);
    });
  }, [elementColors]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <ViewerToolbar
        wireframe={wireframe}
        onReset={handleReset}
        onFit={handleFit}
        onWireframe={handleWireframe}
        onCollisions={onCollisions}
        onCompare={onCompare}
        collisionsActive={collisionsActive}
        compareActive={compareActive}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-sm">Загрузка модели...</span>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80">
          <p className="text-sm text-destructive">{loadError}</p>
          <p className="text-xs text-muted-foreground">Проверьте что IFC-файл доступен</p>
        </div>
      )}
    </div>
  );
}
