'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type * as THREE_NS from 'three';
import type { ViewerScene } from './ifcSceneSetup';
import type { CameraView } from './ViewerToolbar';

interface Props {
  /** Ссылка на главную сцену — читаем главную камеру для синхронизации поворота */
  sceneRef: RefObject<ViewerScene | null>;
  /** Переключение главной камеры в ортогональный вид при клике по грани */
  onViewChange: (view: CameraView) => void;
}

/** Размер overlay-канваса NavCube в пикселях */
const CUBE_SIZE = 120;

/**
 * Порядок материалов BoxGeometry: +X, -X, +Y, -Y, +Z, -Z.
 * Маппинг на CameraView согласован с VIEW_AXIS_OFFSET в IfcViewerCore.tsx
 * (front = +Z, back = -Z, right = +X, left = -X, top = +Y, bottom = -Y).
 */
const FACE_VIEW_MAP: readonly CameraView[] = [
  'right',  // 0 → +X
  'left',   // 1 → -X
  'top',    // 2 → +Y
  'bottom', // 3 → -Y
  'front',  // 4 → +Z
  'back',   // 5 → -Z
];

const FACE_LABELS: readonly string[] = ['П', 'Л', 'Т', 'Н', 'СП', 'СЗ'];

/** Создаёт CanvasTexture 128×128 с подписью грани (Т/Н/СП/СЗ/Л/П) */
function makeLabelTexture(
  label: string,
  THREE: typeof THREE_NS,
): THREE_NS.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * NavCube — куб ориентации в правом нижнем углу вьюера (120×120px).
 * Второй WebGLRenderer поверх canvas IfcViewerCore; вращается синхронно
 * с главной камерой; клик по грани переключает главную камеру в
 * соответствующий ортогональный вид через onViewChange → applyView().
 */
export function NavCube({ sceneRef, onViewChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Храним актуальный onViewChange в ref, чтобы не пересоздавать сцену при смене
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      if (disposed) return;

      // ─── Сцена и камера NavCube (отдельно от главной) ──────────────────────
      const navScene = new THREE.Scene();
      const navCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
      navCamera.position.set(0, 0, 3);

      const navRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      navRenderer.setSize(CUBE_SIZE, CUBE_SIZE);
      navRenderer.setPixelRatio(1);
      navRenderer.setClearColor(0x000000, 0);
      navRenderer.domElement.style.width = `${CUBE_SIZE}px`;
      navRenderer.domElement.style.height = `${CUBE_SIZE}px`;
      navRenderer.domElement.style.cursor = 'pointer';
      container.appendChild(navRenderer.domElement);

      // ─── Мягкое освещение для MeshLambertMaterial ──────────────────────────
      navScene.add(new THREE.AmbientLight(0xffffff, 1));

      // ─── Куб с 6 лейбл-текстурами ──────────────────────────────────────────
      const textures: THREE_NS.CanvasTexture[] = FACE_LABELS.map((l) =>
        makeLabelTexture(l, THREE),
      );
      const materials: THREE_NS.MeshBasicMaterial[] = textures.map(
        (map) => new THREE.MeshBasicMaterial({ map }),
      );
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const cube = new THREE.Mesh(geometry, materials);
      navScene.add(cube);

      // Тонкая обводка рёбер куба для лучшей читаемости
      const edges = new THREE.EdgesGeometry(geometry);
      const lines = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x475569 }),
      );
      cube.add(lines);

      // ─── Hover: подсветка грани через emissive (MeshBasicMaterial не умеет
      // emissive — меняем color, базовый белый #FFFFFF → голубой #93C5FD) ────
      let hoveredFace: number | null = null;
      const HOVER_COLOR = new THREE.Color(0x93c5fd);
      const BASE_COLOR = new THREE.Color(0xffffff);

      const setHoveredFace = (face: number | null) => {
        if (hoveredFace === face) return;
        if (hoveredFace !== null) {
          materials[hoveredFace].color.copy(BASE_COLOR);
        }
        if (face !== null) {
          materials[face].color.copy(HOVER_COLOR);
        }
        hoveredFace = face;
      };

      // ─── Raycaster для hover / click ───────────────────────────────────────
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      const updatePointer = (ev: PointerEvent): boolean => {
        const rect = navRenderer.domElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        return true;
      };

      const pickFace = (): number | null => {
        raycaster.setFromCamera(pointer, navCamera);
        const hits = raycaster.intersectObject(cube, false);
        if (hits.length === 0) return null;
        const materialIndex = hits[0].face?.materialIndex;
        return typeof materialIndex === 'number' ? materialIndex : null;
      };

      const handlePointerMove = (ev: PointerEvent) => {
        if (!updatePointer(ev)) return;
        setHoveredFace(pickFace());
      };
      const handlePointerLeave = () => setHoveredFace(null);
      const handleClick = (ev: MouseEvent) => {
        if (!updatePointer(ev as unknown as PointerEvent)) return;
        const face = pickFace();
        if (face === null) return;
        onViewChangeRef.current(FACE_VIEW_MAP[face]);
      };

      navRenderer.domElement.addEventListener('pointermove', handlePointerMove);
      navRenderer.domElement.addEventListener('pointerleave', handlePointerLeave);
      navRenderer.domElement.addEventListener('click', handleClick);

      // ─── Render loop: куб вращается обратно quaternion'у главной камеры, ──
      // так что грань, обращённая к пользователю, соответствует направлению
      // взгляда главной камеры (стандартный паттерн NavCube — Revit, ArchiCAD)
      const renderLoop = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(renderLoop);
        const mainCam = sceneRef.current?.camera;
        if (mainCam) {
          cube.quaternion.copy(mainCam.quaternion).invert();
        }
        navRenderer.render(navScene, navCamera);
      };
      renderLoop();

      cleanup = () => {
        cancelAnimationFrame(rafId);
        navRenderer.domElement.removeEventListener('pointermove', handlePointerMove);
        navRenderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
        navRenderer.domElement.removeEventListener('click', handleClick);
        if (navRenderer.domElement.parentNode) {
          navRenderer.domElement.parentNode.removeChild(navRenderer.domElement);
        }
        geometry.dispose();
        edges.dispose();
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
        (lines.material as THREE_NS.Material).dispose();
        navRenderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      cleanup?.();
    };
  }, [sceneRef]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute bottom-4 right-4 z-20"
      style={{ width: CUBE_SIZE, height: CUBE_SIZE }}
      aria-label="Куб ориентации (NavCube)"
    />
  );
}
