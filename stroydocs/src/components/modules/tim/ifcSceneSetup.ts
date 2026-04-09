/**
 * ifcSceneSetup.ts — утилиты инициализации Three.js сцены и парсинга IFC-геометрии.
 * Запускается только в браузере (вызывается из useEffect).
 */

import type * as THREE_NS from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/addons/controls/OrbitControls.js';
import type { IfcAPI as IfcAPIType } from 'web-ifc';

const DEFAULT_COLOR = '#9CA3AF';

export interface ViewerScene {
  scene: THREE_NS.Scene;
  camera: THREE_NS.PerspectiveCamera;
  renderer: THREE_NS.WebGLRenderer;
  controls: OrbitControlsType;
  raycaster: THREE_NS.Raycaster;
  /** object (THREE.Mesh) → expressID */
  meshMap: Map<object, number>;
  /** expressID → ifcGuid */
  guidMap: Map<number, string>;
  /** expressID → материал (для перекраски) */
  materials: Map<number, THREE_NS.MeshLambertMaterial>;
  /** ID текущего animation frame — обновляется каждый кадр */
  frameId: number;
  wireframe: boolean;
}

export async function initScene(container: HTMLDivElement): Promise<ViewerScene> {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const { clientWidth: w, clientHeight: h } = container;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111827');
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w || 800, h || 600);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(60, (w || 800) / (h || 600), 0.01, 100000);
  camera.position.set(30, 30, 30);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const raycaster = new THREE.Raycaster();
  const meshMap = new Map<object, number>();
  const guidMap = new Map<number, string>();
  const materials = new Map<number, THREE_NS.MeshLambertMaterial>();

  // Собираем vs первым, чтобы animate мог обновлять vs.frameId напрямую
  const vs: ViewerScene = {
    scene, camera, renderer, controls, raycaster,
    meshMap, guidMap, materials, frameId: 0, wireframe: false,
  };

  function animate() {
    vs.frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return vs;
}

export async function loadIfcModel(
  ifcApi: IfcAPIType,
  buffer: Uint8Array,
  vs: ViewerScene
): Promise<void> {
  const THREE = await import('three');

  const modelId = ifcApi.OpenModel(buffer);
  const flatMeshes = ifcApi.LoadAllGeometry(modelId);

  for (let i = 0; i < flatMeshes.size(); i++) {
    const flatMesh = flatMeshes.get(i);
    const expressID = flatMesh.expressID;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const line = ifcApi.GetLine(modelId, expressID) as any;
      if (line?.GlobalId?.value) vs.guidMap.set(expressID, String(line.GlobalId.value));
    } catch { /* не все объекты имеют GlobalId */ }

    for (let j = 0; j < flatMesh.geometries.size(); j++) {
      const placed = flatMesh.geometries.get(j);
      const geom = ifcApi.GetGeometry(modelId, placed.geometryExpressID);
      const verts = ifcApi.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize());
      const idxs = ifcApi.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize());

      const pos = new Float32Array(verts.length / 2);
      const nor = new Float32Array(verts.length / 2);
      for (let k = 0; k < verts.length / 6; k++) {
        pos[k * 3] = verts[k * 6]; pos[k * 3 + 1] = verts[k * 6 + 1]; pos[k * 3 + 2] = verts[k * 6 + 2];
        nor[k * 3] = verts[k * 6 + 3]; nor[k * 3 + 1] = verts[k * 6 + 4]; nor[k * 3 + 2] = verts[k * 6 + 5];
      }

      const bufGeom = new THREE.BufferGeometry();
      bufGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      bufGeom.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      bufGeom.setIndex(new THREE.BufferAttribute(new Uint32Array(idxs), 1));

      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(DEFAULT_COLOR),
        transparent: placed.color.w < 1,
        opacity: placed.color.w,
        side: THREE.DoubleSide,
      });
      vs.materials.set(expressID, mat);

      const mesh = new THREE.Mesh(bufGeom, mat);
      mesh.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation));
      vs.scene.add(mesh);
      vs.meshMap.set(mesh, expressID);
      geom.delete();
    }
  }

  ifcApi.CloseModel(modelId);
}
