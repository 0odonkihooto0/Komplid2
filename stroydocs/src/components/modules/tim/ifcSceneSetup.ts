/**
 * ifcSceneSetup.ts — утилиты инициализации Three.js сцены и загрузки glTF-модели.
 * Запускается только в браузере (вызывается из useEffect).
 * Геометрия загружается из .glb (IfcConvert --use-element-guids), без WASM в браузере.
 */

import type * as THREE_NS from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/addons/controls/OrbitControls.js';
import type { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export interface ViewerScene {
  scene: THREE_NS.Scene;
  camera: THREE_NS.PerspectiveCamera;
  renderer: THREE_NS.WebGLRenderer;
  controls: OrbitControlsType;
  raycaster: THREE_NS.Raycaster;
  /** mesh (Object3D) → ifcGuid (строка из userData.ifcGuid, заполненной IfcConvert) */
  meshMap: Map<object, string>;
  /** ifcGuid → материал (для перекраски по выделению / цветовым картам) */
  materials: Map<string, THREE_NS.MeshLambertMaterial>;
  /** ifcGuid → оригинальный цвет [R, G, B] (0.0–1.0) из glTF для восстановления после выбора */
  originalColors: Map<string, [number, number, number]>;
  /** IFC слои: имя слоя → множество ifcGuid элементов */
  layers: Map<string, Set<string>>;
  /** CSS2DRenderer для текстовых меток измерений */
  css2dRenderer: CSS2DRenderer;
  /** ID текущего animation frame — обновляется каждый кадр */
  frameId: number;
  wireframe: boolean;
}

export async function initScene(container: HTMLDivElement): Promise<ViewerScene> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { CSS2DRenderer } = await import('three/addons/renderers/CSS2DRenderer.js');

  const { clientWidth: w, clientHeight: h } = container;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111827');
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.4));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w || 800, h || 600);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // CSS2DRenderer — поверх canvas для текстовых меток измерений
  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(w || 800, h || 600);
  css2dRenderer.domElement.style.position = 'absolute';
  css2dRenderer.domElement.style.top = '0px';
  css2dRenderer.domElement.style.left = '0px';
  css2dRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(css2dRenderer.domElement);

  const camera = new THREE.PerspectiveCamera(60, (w || 800) / (h || 600), 0.01, 100000);
  camera.position.set(30, 30, 30);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const raycaster = new THREE.Raycaster();
  const meshMap = new Map<object, string>();
  const materials = new Map<string, THREE_NS.MeshLambertMaterial>();
  const originalColors = new Map<string, [number, number, number]>();
  const layers = new Map<string, Set<string>>();

  // Собираем vs первым, чтобы animate мог обновлять vs.frameId напрямую
  const vs: ViewerScene = {
    scene, camera, renderer, css2dRenderer, controls, raycaster,
    meshMap, materials, originalColors, layers, frameId: 0, wireframe: false,
  };

  function animate() {
    vs.frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    css2dRenderer.render(scene, camera);
  }
  animate();

  return vs;
}

/**
 * Загружает .glb-файл через GLTFLoader, регистрирует меши в ViewerScene.
 * IfcConvert с --use-element-guids сохраняет GUID в userData.ifcGuid каждого узла.
 * Материалы GLB (PBR) конвертируются в MeshLambertMaterial для wireframe/перекраски.
 */
export async function loadGlbModel(
  glbUrl: string,
  vs: ViewerScene,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

  return new Promise<void>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;

          // GUID из extras — IfcConvert записывает через --use-element-guids
          const guid: string | undefined = child.userData.ifcGuid as string | undefined;
          if (!guid) return;

          // Извлечь базовый цвет из GLB-материала (PBR MeshStandardMaterial)
          // и конвертировать в MeshLambertMaterial для единообразия wireframe/перекраски
          const srcMat = Array.isArray(child.material) ? child.material[0] : child.material;
          const baseColor = (srcMat instanceof THREE.MeshStandardMaterial && srcMat.color)
            ? srcMat.color.clone()
            : new THREE.Color(0x9CA3AF); // серый по умолчанию
          const opacity = (srcMat as THREE_NS.Material).opacity ?? 1;

          const mat = new THREE.MeshLambertMaterial({
            color: baseColor,
            transparent: opacity < 1,
            opacity,
            depthWrite: opacity >= 1,
            side: THREE.DoubleSide,
          });
          child.material = mat;

          vs.meshMap.set(child, guid);
          vs.materials.set(guid, mat);
          vs.originalColors.set(guid, [baseColor.r, baseColor.g, baseColor.b]);

          // Слой из userData (IfcConvert может сохранять layer в extras)
          const layer = (child.userData.ifcLayer ?? child.userData.layer) as string | undefined;
          if (layer) {
            const layerSet = vs.layers.get(layer) ?? new Set<string>();
            layerSet.add(guid);
            vs.layers.set(layer, layerSet);
          }
        });

        vs.scene.add(gltf.scene);

        // Fit-to-view: центрировать камеру по bounding box загруженной модели
        const bbox = new THREE.Box3().setFromObject(gltf.scene);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        vs.camera.position
          .copy(center)
          .addScaledVector(new THREE.Vector3(1, 1, 1).normalize(), maxDim * 1.8);
        vs.controls.target.copy(center);
        vs.controls.update();

        resolve();
      },
      (xhr) => {
        if (xhr.total > 0) onProgress?.((xhr.loaded / xhr.total) * 100);
      },
      reject,
    );
  });
}
