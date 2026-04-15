'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Vector2 } from 'three';
import { Loader2 } from 'lucide-react';
import { ViewerToolbar } from './ViewerToolbar';
import { ClippingPanel } from './ClippingPanel';
import { LayerPanel } from './LayerPanel';
import { ViewerContextMenu } from './ViewerContextMenu';
import { useClippingPlanes } from './useClippingPlanes';
import { useMeasurements } from './useMeasurements';
import { useLayerManager } from './useLayerManager';
import { useViewerExport } from './useViewerExport';
import { initScene, loadGlbModel } from './ifcSceneSetup';
import type { ViewerScene } from './ifcSceneSetup';

const DEFAULT_COLOR = '#9CA3AF';
const SELECTED_COLOR = '#60A5FA';

interface Props {
  /** ID объекта строительства (используется для запроса /glb-url) */
  projectId: string;
  /** ID BIM-модели (используется для запроса /glb-url) */
  modelId: string;
  /** Presigned URL для скачивания исходного IFC-файла (кнопка Download) */
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
  projectId,
  modelId,
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
  // Стабильные рефы для коллбеков — не вызывают пересоздание viewer
  const onSelectedRef = useRef(onElementSelected);
  onSelectedRef.current = onElementSelected;
  const onSceneReadyRef = useRef(onSceneReady);
  onSceneReadyRef.current = onSceneReady;

  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Загрузка модели...');
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // ─── Разрезы, измерения, слои ────────────────────────────────────────────────
  const clipping = useClippingPlanes(sceneRef);
  const measure = useMeasurements(sceneRef);
  const layerManager = useLayerManager(sceneRef);
  const { downloadIfc, screenshot } = useViewerExport(sceneRef, downloadUrl);
  // Стабильный реф для initializeLayers — не добавляем в зависимости useEffect
  const initLayersRef = useRef(layerManager.initializeLayers);
  initLayersRef.current = layerManager.initializeLayers;
  // Стабильный реф чтобы onClick внутри useEffect видел актуальный handleMeasureClick
  const measureRef = useRef(measure);
  measureRef.current = measure;

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

  // ─── Инициализация сцены + загрузка GLB ──────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      setLoadError(null);
      setLoadingProgress(null);

      const vs = await initScene(container!);
      if (cancelled) { vs.renderer.dispose(); return; }
      sceneRef.current = vs;

      try {
        // Получить presigned URL для .glb — с поллингом пока конвертация не завершена
        let glbUrl: string | null = null;
        while (glbUrl === null && !cancelled) {
          const res = await fetch(
            `/api/projects/${projectId}/bim/models/${modelId}/glb-url`
          );
          if (res.status === 202) {
            // GLB ещё не готов — ждём 3 секунды и повторяем
            setLoadingText('Конвертация модели в glTF...');
            await new Promise<void>(r => setTimeout(r, 3000));
            continue;
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: не удалось получить URL модели`);
          }
          const json = (await res.json()) as { url: string };
          glbUrl = json.url;
        }

        if (cancelled) return;

        setLoadingText('Загрузка модели...');
        await loadGlbModel(glbUrl!, vs, (pct) => {
          if (!cancelled) setLoadingProgress(Math.round(pct));
        });

        // Уведомить внешний код что сцена и элементы готовы
        if (!cancelled) {
          onSceneReadyRef.current?.(vs);
          initLayersRef.current();
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки модели');
      }

      if (!cancelled) setLoading(false);
    }

    init().catch(err => {
      if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Ошибка инициализации');
      setLoading(false);
    });

    // Клик: сначала пробуем режим измерений, потом обычный выбор элемента
    function onClick(e: MouseEvent) {
      const s = sceneRef.current;
      if (!s || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      void measureRef.current.handleMeasureClick(e, rect).then(consumed => {
        if (consumed) return;
        // Обычный режим — raycasting для выбора элемента
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        s.raycaster.setFromCamera(new Vector2(x, y), s.camera);
        const meshes = Array.from(s.meshMap.keys()).filter(
          (o): o is import('three').Object3D => typeof o === 'object' && o !== null && 'isObject3D' in o
        );
        const hits = s.raycaster.intersectObjects(meshes);
        if (!hits.length) { onSelectedRef.current(null); return; }

        // GUID берётся напрямую из meshMap (строка, без промежуточного expressID)
        const guid = s.meshMap.get(hits[0].object) ?? null;
        onSelectedRef.current(guid);

        // Подсветить выбранный элемент, восстановить оригинальный цвет для остальных
        s.materials.forEach((mat, id) => {
          if (id === guid) {
            mat.color.set(SELECTED_COLOR);
          } else {
            const orig = s.originalColors.get(id);
            if (orig) mat.color.setRGB(orig[0], orig[1], orig[2]);
            else mat.color.set(DEFAULT_COLOR);
          }
        });
      });
    }

    function onResize() {
      const s = sceneRef.current;
      if (!s || !containerRef.current) return;
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      s.renderer.setSize(w, h);
      s.css2dRenderer.setSize(w, h);
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }

    container.addEventListener('click', onClick);
    container.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      container.removeEventListener('click', onClick);
      container.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
      const s = sceneRef.current;
      if (s) {
        cancelAnimationFrame(s.frameId);
        s.renderer.dispose();
        if (container.contains(s.renderer.domElement)) container.removeChild(s.renderer.domElement);
        // Убрать CSS2DRenderer overlay
        if (container.contains(s.css2dRenderer.domElement)) container.removeChild(s.css2dRenderer.domElement);
      }
      sceneRef.current = null;
    };
    // Пересоздаём только при смене модели — коллбек стабилизирован через ref
  }, [projectId, modelId]);

  // ─── Цветовая карта элементов (GUID-based) ───────────────────────────────────
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !elementColors) return;
    s.materials.forEach((mat, guid) => {
      const color = elementColors.get(guid);
      if (color) {
        mat.color.set(color);
      } else {
        const orig = s.originalColors.get(guid);
        if (orig) mat.color.setRGB(orig[0], orig[1], orig[2]);
      }
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
        onClipping={clipping.toggle}
        clippingActive={clipping.active}
        onMeasure={measure.toggleActive}
        measureActive={measure.active}
        onCollisions={onCollisions}
        onCompare={onCompare}
        collisionsActive={collisionsActive}
        compareActive={compareActive}
        onLayers={layerManager.layerVisibility.size > 0 ? () => setLayersOpen(v => !v) : undefined}
        layersActive={layersOpen}
        onDownloadIfc={downloadIfc}
        onScreenshot={() => screenshot('png')}
      />

      {/* Панель слоёв */}
      {layersOpen && (
        <LayerPanel
          layers={layerManager.layerVisibility}
          onToggle={layerManager.setLayerVisible}
          onShowAll={layerManager.showAll}
          onHideAll={layerManager.hideAll}
        />
      )}

      {/* Контекстное меню правого клика */}
      {contextMenu && (
        <ViewerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onSavePng={() => { screenshot('png'); setContextMenu(null); }}
          onSaveJpg={() => { screenshot('jpeg'); setContextMenu(null); }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Панель управления разрезом */}
      {clipping.active && (
        <ClippingPanel
          axis={clipping.axis}
          value={clipping.value}
          onAxisChange={clipping.handleAxisChange}
          onValueChange={clipping.handleValueChange}
          onClear={clipping.clear}
        />
      )}

      {/* Кнопка удаления всех измерений */}
      {measure.active && measure.measurements.length > 0 && (
        <button
          onClick={measure.clearAll}
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs shadow-md backdrop-blur-sm hover:bg-accent"
        >
          Удалить все измерения ({measure.measurements.length})
        </button>
      )}

      {/* Подсказка при активном режиме измерений без точек */}
      {measure.active && measure.measurements.length === 0 && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs shadow-md backdrop-blur-sm">
          Кликните на модель для выбора первой точки
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm">{loadingText}</span>
          {loadingProgress !== null && (
            <span className="text-xs text-muted-foreground">{loadingProgress}%</span>
          )}
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80">
          <p className="text-sm text-destructive">{loadError}</p>
          <p className="text-xs text-muted-foreground">Проверьте что модель успешно конвертирована</p>
        </div>
      )}
    </div>
  );
}
