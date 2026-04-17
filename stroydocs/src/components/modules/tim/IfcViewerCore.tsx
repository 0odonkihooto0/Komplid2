'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Vector2 } from 'three';
import type * as THREE_NS from 'three';
import { ViewerToolbar, type CameraView } from './ViewerToolbar';
import { ClippingPanel } from './ClippingPanel';
import { LayerPanel } from './LayerPanel';
import { ViewerContextMenu } from './ViewerContextMenu';
import { ConversionProgress, type ConversionUiState } from './ConversionProgress';
import { DisplayModeLegend } from './DisplayModeLegend';
import { NavCube } from './NavCube';
import { useClippingPlanes } from './useClippingPlanes';
import { useMeasurements } from './useMeasurements';
import { useLayerManager } from './useLayerManager';
import { useViewerExport } from './useViewerExport';
import { useDisplayModes } from './useDisplayModes';
import { initScene, loadGlbModel } from './ifcSceneSetup';
import type { ViewerScene } from './ifcSceneSetup';

/** Интервал опроса статуса модели (мс) */
const POLL_INTERVAL_MS = 5_000;
/** Через сколько мс в статусе CONVERTING показать fallback-панель */
const FALLBACK_AFTER_MS = 10 * 60 * 1000; // 10 минут

/** Локализованные метки видов для overlay в левом верхнем углу canvas */
const VIEW_LABELS: Record<CameraView, string> = {
  perspective: 'Перспектива',
  front: 'Спереди',
  back: 'Сзади',
  left: 'Слева',
  right: 'Справа',
  top: 'Сверху',
  bottom: 'Снизу',
};

/** Смещение камеры от центра модели для каждого ортогонального вида */
const VIEW_AXIS_OFFSET: Record<Exclude<CameraView, 'perspective'>, [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
};

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
  /** Экспорт элементов в CSV (ifcType — фильтр, undefined = все) */
  onExportCsv?: (ifcType?: string) => void;
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
  onExportCsv,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  // Стабильные рефы для коллбеков — не вызывают пересоздание viewer
  const onSelectedRef = useRef(onElementSelected);
  onSelectedRef.current = onElementSelected;
  const onSceneReadyRef = useRef(onSceneReady);
  onSceneReadyRef.current = onSceneReady;

  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Выбранный элемент — нужен X-Ray режиму для подсветки только выбранного */
  const [selectedGuid, setSelectedGuid] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  /** Текущий вид камеры (перспектива / 6 ортогональных) — управляется дропдауном «Вид» */
  const [currentView, setCurrentView] = useState<CameraView>('perspective');
  /** Сохранённая позиция перспективной камеры — восстанавливается при возврате из орто-вида */
  const perspectiveStateRef = useRef<{
    position: [number, number, number];
    target: [number, number, number];
  } | null>(null);

  // ─── Состояние конвертации BIM-модели ────────────────────────────────────────
  const [conversionState, setConversionState] = useState<ConversionUiState | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [reconverting, setReconverting] = useState(false);

  // ─── Разрезы, измерения, слои, режимы отображения ────────────────────────────
  const clipping = useClippingPlanes(sceneRef);
  const measure = useMeasurements(sceneRef);
  const layerManager = useLayerManager(sceneRef);
  const displayModes = useDisplayModes(sceneRef, selectedGuid, projectId, modelId);
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

  /**
   * Переключение между перспективным и ортогональным видами.
   * Для орто-вида создаём OrthographicCamera и пересоздаём OrbitControls —
   * попытка `controls.object = camera` оставляет внутренний стейт (spherical,
   * lastPosition), привязанный к старой камере, и даёт рывки при первом drag.
   */
  const applyView = useCallback(async (view: CameraView) => {
    const s = sceneRef.current;
    if (!s) return;
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

    const { clientWidth: w, clientHeight: h } = s.renderer.domElement;
    const aspect = h > 0 ? w / h : 1;

    const box = new THREE.Box3().setFromObject(s.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 10;

    // Перед сменой на ортогональный вид — запомнить позицию текущей перспективной камеры
    if (view !== 'perspective' && s.camera instanceof THREE.PerspectiveCamera) {
      const p = s.camera.position;
      const t = s.controls.target;
      perspectiveStateRef.current = {
        position: [p.x, p.y, p.z],
        target: [t.x, t.y, t.z],
      };
    }

    let camera: THREE_NS.PerspectiveCamera | THREE_NS.OrthographicCamera;
    let target: THREE_NS.Vector3;

    if (view === 'perspective') {
      const pcam = new THREE.PerspectiveCamera(45, aspect, 0.01, Math.max(100000, maxDim * 100));
      const saved = perspectiveStateRef.current;
      if (saved) {
        pcam.position.set(saved.position[0], saved.position[1], saved.position[2]);
        target = new THREE.Vector3(saved.target[0], saved.target[1], saved.target[2]);
      } else {
        // Дефолтный fit по центру модели (паттерн как в loadGlbModel)
        pcam.position
          .copy(center)
          .addScaledVector(new THREE.Vector3(1, 1, 1).normalize(), maxDim * 1.8);
        target = center.clone();
      }
      camera = pcam;
    } else {
      const halfH = maxDim;
      const halfW = halfH * aspect;
      const ocam = new THREE.OrthographicCamera(
        -halfW, halfW, halfH, -halfH,
        -maxDim * 10, maxDim * 10,
      );
      const axis = VIEW_AXIS_OFFSET[view];
      ocam.position
        .copy(center)
        .add(new THREE.Vector3(axis[0], axis[1], axis[2]).multiplyScalar(maxDim * 2));
      // Для видов сверху/снизу стандартный up (0,1,0) даёт вырождение — камера смотрит
      // вдоль оси Y. Перенаправляем up на ось -Z, чтобы верх сцены совпадал с направлением «север».
      if (view === 'top' || view === 'bottom') {
        ocam.up.set(0, 0, -1);
      } else {
        ocam.up.set(0, 1, 0);
      }
      ocam.lookAt(center);
      camera = ocam;
      target = center.clone();
    }

    // Пересоздаём OrbitControls — смена .object оставляет stale internal state
    s.controls.dispose();
    const controls = new OrbitControls(camera, s.renderer.domElement);
    controls.enableDamping = true;
    controls.target.copy(target);
    controls.update();

    s.controls = controls;
    s.camera = camera;
    setCurrentView(view);
  }, []);

  // ─── Действия на экране прогресса/ошибки ─────────────────────────────────────
  const handleReload = useCallback(() => {
    if (typeof window !== 'undefined') window.location.reload();
  }, []);

  const handleReconvert = useCallback(async () => {
    if (reconverting) return;
    setReconverting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/bim/models/${modelId}/reconvert`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      // После постановки задачи в очередь — перезагружаем страницу чтобы
      // поллинг стартовал с чистого состояния CONVERTING.
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Не удалось перезапустить конвертацию');
      setReconverting(false);
    }
  }, [projectId, modelId, reconverting]);

  // ─── Инициализация сцены + поллинг статуса модели + загрузка GLB ─────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    const startedAt = Date.now();

    async function init() {
      setLoading(true);
      setLoadError(null);
      setLoadingProgress(null);
      setConversionState(null);
      setConvertError(null);

      const vs = await initScene(container!);
      if (cancelled) { vs.renderer.dispose(); return; }
      sceneRef.current = vs;

      try {
        // Опрашиваем статус модели раз в 5 секунд пока не придёт READY.
        // Если >10 мин в CONVERTING → переключаемся в FALLBACK (3D недоступен, структура работает).
        let glbUrl: string | null = null;

        while (glbUrl === null && !cancelled) {
          const res = await fetch(
            `/api/projects/${projectId}/bim/models/${modelId}`
          );

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: не удалось получить статус модели`);
          }

          const json = (await res.json()) as {
            success: boolean;
            data?: {
              status: 'PROCESSING' | 'CONVERTING' | 'READY' | 'ERROR';
              metadata?: { glbS3Key?: string; convertError?: string } | null;
            };
          };
          if (!json.success || !json.data) {
            throw new Error('Не удалось получить данные модели');
          }

          const { status, metadata } = json.data;
          const elapsed = Date.now() - startedAt;

          if (status === 'ERROR') {
            if (!cancelled) {
              setConvertError(metadata?.convertError ?? 'Ошибка конвертации модели');
              setConversionState('ERROR');
              setLoading(false);
            }
            return;
          }

          // Защита от зависания: status=READY, но glbS3Key отсутствует —
          // конвертация не записала ключ → бесконечный поллинг. Кидаем понятную ошибку.
          if (status === 'READY' && !metadata?.glbS3Key) {
            throw new Error(
              'Модель готова, но GLB-файл не найден (metadata.glbS3Key = null). Запустите конвертацию заново.'
            );
          }

          if (status === 'READY' && metadata?.glbS3Key) {
            // GLB готов — запрашиваем presigned URL и выходим из цикла
            const urlRes = await fetch(
              `/api/projects/${projectId}/bim/models/${modelId}/glb-url`
            );
            if (!urlRes.ok) {
              throw new Error(`HTTP ${urlRes.status}: не удалось получить URL GLB`);
            }
            const urlJson = (await urlRes.json()) as { success: boolean; data?: { url: string } };
            if (!urlJson.success || !urlJson.data?.url) {
              throw new Error('URL GLB отсутствует в ответе');
            }
            glbUrl = urlJson.data.url;
            break;
          }

          // PROCESSING или CONVERTING — показываем прогресс-экран с таймером
          if (!cancelled) {
            setConversionState(status === 'PROCESSING' ? 'PROCESSING' : 'CONVERTING');
            setElapsedSec(Math.floor(elapsed / 1000));
          }

          // Fallback после 10 минут висения в CONVERTING
          if (status === 'CONVERTING' && elapsed > FALLBACK_AFTER_MS) {
            if (!cancelled) {
              setConversionState('FALLBACK');
              setLoading(false);
            }
            return;
          }

          await new Promise<void>(r => setTimeout(r, POLL_INTERVAL_MS));
        }

        if (cancelled || !glbUrl) return;

        // GLB готов — скрываем прогресс-экран, загружаем модель
        setConversionState(null);
        await loadGlbModel(glbUrl, vs, (pct) => {
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
        if (!hits.length) {
          setSelectedGuid(null);
          onSelectedRef.current(null);
          return;
        }

        // GUID берётся напрямую из meshMap (строка, без промежуточного expressID)
        const guid = s.meshMap.get(hits[0].object) ?? null;
        setSelectedGuid(guid);
        onSelectedRef.current(guid);
        // Подсветка выбранного элемента делегирована useDisplayModes
        // (эмиссия применяется ко всем режимам автоматически через useEffect хука)
      });
    }

    function onResize() {
      const s = sceneRef.current;
      if (!s || !containerRef.current) return;
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      // PerspectiveCamera хранит aspect, OrthographicCamera — left/right/top/bottom
      if ('isPerspectiveCamera' in s.camera && s.camera.isPerspectiveCamera) {
        s.camera.aspect = w / h;
        s.camera.updateProjectionMatrix();
      } else if ('isOrthographicCamera' in s.camera && s.camera.isOrthographicCamera) {
        const halfH = (s.camera.top - s.camera.bottom) / 2;
        const halfW = halfH * (w / h);
        s.camera.left = -halfW;
        s.camera.right = halfW;
        s.camera.updateProjectionMatrix();
      }
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
    <div className="flex h-full w-full flex-col">
      <ViewerToolbar
        displayMode={displayModes.mode}
        onDisplayModeChange={displayModes.setMode}
        currentView={currentView}
        onViewChange={applyView}
        onReset={handleReset}
        onFit={handleFit}
        onClipping={clipping.togglePanel}
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
        onExportCsv={onExportCsv}
      />

      <div className="relative min-h-0 flex-1">
      <div ref={containerRef} className="h-full w-full" />

      {/* Метка вида — динамически отражает currentView */}
      <div className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-white/70 px-2 py-0.5 text-xs text-gray-500 backdrop-blur">
        {VIEW_LABELS[currentView]}
      </div>

      {/* Легенда цветов по типу IFC — только в режиме «По типу» */}
      <DisplayModeLegend mode={displayModes.mode} />

      {/* Куб ориентации (NavCube) — правый нижний угол, синхронизация с главной камерой */}
      <NavCube sceneRef={sceneRef} onViewChange={applyView} />

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

      {/* Панель управления разрезами (до 3 плоскостей одновременно) */}
      {clipping.panelOpen && (
        <ClippingPanel
          planes={clipping.planes}
          onAdd={clipping.addPlane}
          onUpdate={clipping.updatePlane}
          onRemove={clipping.removePlane}
          onClearAll={clipping.clearAll}
          onClose={clipping.closePanel}
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

      {/* Экран прогресса конвертации: PROCESSING / CONVERTING / ERROR / FALLBACK */}
      {conversionState && (
        <ConversionProgress
          state={conversionState}
          elapsedSec={elapsedSec}
          errorMessage={convertError}
          onReload={handleReload}
          onReconvert={handleReconvert}
          reconverting={reconverting}
        />
      )}

      {/* Skeleton-загрузка GLB через сеть (после получения presigned URL) */}
      {loading && !conversionState && (
        <div className="absolute inset-0 flex flex-col gap-3 bg-background/90 p-6">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="flex-1 animate-pulse rounded-lg bg-muted/60" />
          <div className="flex items-center justify-between">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            {loadingProgress !== null && (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {loadingProgress}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ошибка сети / загрузки GLB (уже после того как glbUrl получен) */}
      {loadError && !conversionState && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80">
          <p className="text-sm text-destructive">{loadError}</p>
          <button
            onClick={handleReload}
            className="mt-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent"
          >
            Обновить страницу
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
