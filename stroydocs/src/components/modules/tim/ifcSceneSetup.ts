/**
 * ifcSceneSetup.ts — утилиты инициализации Three.js сцены и парсинга IFC-геометрии.
 * Запускается только в браузере (вызывается из useEffect).
 */

import type * as THREE_NS from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/addons/controls/OrbitControls.js';
import type { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { IfcAPI as IfcAPIType } from 'web-ifc';

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
  /** expressID → оригинальный IFC-цвет [R, G, B] (0.0–1.0) для восстановления после выбора */
  originalColors: Map<number, [number, number, number]>;
  /** IFC PropertySets: GUID → { [psetName]: { [propName]: value } } */
  ifcProperties: Map<string, Record<string, Record<string, unknown>>>;
  /** IFC слои: имя слоя → множество expressID элементов */
  layers: Map<string, Set<number>>;
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
  const meshMap = new Map<object, number>();
  const guidMap = new Map<number, string>();
  const materials = new Map<number, THREE_NS.MeshLambertMaterial>();
  const originalColors = new Map<number, [number, number, number]>();
  const ifcProperties = new Map<string, Record<string, Record<string, unknown>>>();
  const layers = new Map<string, Set<number>>();

  // Собираем vs первым, чтобы animate мог обновлять vs.frameId напрямую
  const vs: ViewerScene = {
    scene, camera, renderer, css2dRenderer, controls, raycaster,
    meshMap, guidMap, materials, originalColors, ifcProperties, layers, frameId: 0, wireframe: false,
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

/** Извлечь строковое значение из IFC-поля { type, value } */
function extractIfcStr(field: unknown): string | null {
  if (!field || typeof field !== 'object') return null;
  const f = field as Record<string, unknown>;
  return typeof f.value === 'string' ? f.value : null;
}

/**
 * Сканирует все линии IFC-модели для построения карты PropertySets.
 * Ищет IfcRelDefinesByProperties → IfcPropertySet / IfcElementQuantity → IfcPropertySingleValue.
 * Результат записывается в vs.ifcProperties: GUID → { [psetName]: { [propName]: value } }.
 */
function buildIfcPropertiesMap(ifcApi: IfcAPIType, modelId: number, vs: ViewerScene): void {
  const allLines = ifcApi.GetAllLines(modelId);

  // psetExpressID → { name, props }
  const rawPsets = new Map<number, { name: string; props: Record<string, unknown> }>();
  // elementExpressID → psetExpressID[]
  const elemToPsets = new Map<number, number[]>();

  for (const lineID of Array.from(allLines)) {
    let line: Record<string, unknown> | null = null;
    try {
      line = ifcApi.GetLine(modelId, lineID, false) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (!line) continue;

    // IfcPropertySet (HasProperties) или IfcElementQuantity (Quantities)
    const propsArr = Array.isArray(line.HasProperties) ? line.HasProperties
      : Array.isArray(line.Quantities) ? line.Quantities : null;
    if (propsArr) {
      const psetName = extractIfcStr(line.Name) ?? `Pset_${lineID}`;
      const props: Record<string, unknown> = {};
      for (const ref of propsArr as Array<{ value?: unknown }>) {
        const propID = typeof ref?.value === 'number' ? ref.value : null;
        if (propID == null) continue;
        try {
          const p = ifcApi.GetLine(modelId, propID, false) as Record<string, unknown>;
          const propName = extractIfcStr(p?.Name);
          // NominalValue (PropertySingleValue) или *Value (IfcQuantity*)
          const valObj = p?.NominalValue
            ?? p?.LengthValue ?? p?.AreaValue ?? p?.VolumeValue
            ?? p?.CountValue ?? p?.WeightValue ?? p?.TimeValue;
          const val = valObj && typeof valObj === 'object'
            ? (valObj as Record<string, unknown>).value ?? null : null;
          if (propName) props[propName] = val ?? null;
        } catch { /* пропустить нечитаемые свойства */ }
      }
      rawPsets.set(lineID, { name: psetName, props });
    }

    // IfcRelDefinesByProperties: RelatedObjects → элементы, RelatingPropertyDefinition → PropertySet
    if (Array.isArray(line.RelatedObjects) && line.RelatingPropertyDefinition != null) {
      const psetRef = line.RelatingPropertyDefinition as Record<string, unknown>;
      const psetID = typeof psetRef?.value === 'number' ? psetRef.value : null;
      if (psetID == null) continue;
      for (const objRef of line.RelatedObjects as Array<{ value?: unknown }>) {
        const elemID = typeof objRef?.value === 'number' ? objRef.value : null;
        if (elemID == null) continue;
        const arr = elemToPsets.get(elemID) ?? [];
        arr.push(psetID);
        elemToPsets.set(elemID, arr);
      }
    }
  }

  // Собрать результат: GUID → { [psetName]: { [propName]: value } }
  for (const [expressID, guid] of Array.from(vs.guidMap)) {
    const psetIDs = elemToPsets.get(expressID);
    if (!psetIDs?.length) continue;
    const result: Record<string, Record<string, unknown>> = {};
    for (const psetID of psetIDs) {
      const pset = rawPsets.get(psetID);
      if (pset && Object.keys(pset.props).length > 0) {
        result[pset.name] = pset.props;
      }
    }
    if (Object.keys(result).length > 0) {
      vs.ifcProperties.set(guid, result);
    }
  }
}

/**
 * Сканирует IfcPresentationLayerAssignment для построения карты слоёв.
 * Результат записывается в vs.layers: layerName → Set<expressID>.
 */
function buildLayerMap(ifcApi: IfcAPIType, modelId: number, vs: ViewerScene): void {
  // Шаг 1: shapeRepId → layerName из IfcPresentationLayerAssignment
  const shapeToLayer = new Map<number, string>();
  const allLines = ifcApi.GetAllLines(modelId);

  for (const lineID of Array.from(allLines)) {
    let line: Record<string, unknown> | null = null;
    try {
      line = ifcApi.GetLine(modelId, lineID, false) as Record<string, unknown>;
    } catch { continue; }
    if (!line) continue;

    // IfcPresentationLayerAssignment детектируем по наличию AssignedItems[] + Name
    if (!Array.isArray(line.AssignedItems) || !line.Name) continue;
    const layerName = extractIfcStr(line.Name);
    if (!layerName) continue;

    for (const item of line.AssignedItems as Array<{ value?: unknown }>) {
      const itemId = typeof item?.value === 'number' ? item.value : null;
      if (itemId !== null) shapeToLayer.set(itemId, layerName);
    }
  }

  if (shapeToLayer.size === 0) return;

  // Шаг 2: для каждого продукта из guidMap ищем его shape representations
  for (const [expressID] of Array.from(vs.guidMap)) {
    let product: Record<string, unknown> | null = null;
    try {
      product = ifcApi.GetLine(modelId, expressID, false) as Record<string, unknown>;
    } catch { continue; }
    if (!product?.Representation) continue;

    const repRef = product.Representation as Record<string, unknown>;
    const repId = typeof repRef?.value === 'number' ? repRef.value : null;
    if (repId === null) continue;

    let productRep: Record<string, unknown> | null = null;
    try {
      productRep = ifcApi.GetLine(modelId, repId, false) as Record<string, unknown>;
    } catch { continue; }
    if (!Array.isArray(productRep?.Representations)) continue;

    for (const shapeRef of productRep.Representations as Array<{ value?: unknown }>) {
      const shapeId = typeof shapeRef?.value === 'number' ? shapeRef.value : null;
      if (shapeId === null) continue;
      const layerName = shapeToLayer.get(shapeId);
      if (!layerName) continue;

      let layerSet = vs.layers.get(layerName);
      if (!layerSet) { layerSet = new Set<number>(); vs.layers.set(layerName, layerSet); }
      layerSet.add(expressID);
      break; // первый найденный слой достаточен
    }
  }
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
        color: new THREE.Color(placed.color.x, placed.color.y, placed.color.z),
        transparent: placed.color.w < 1,
        opacity: placed.color.w,
        depthWrite: placed.color.w >= 1,
        side: THREE.DoubleSide,
      });
      vs.materials.set(expressID, mat);
      vs.originalColors.set(expressID, [placed.color.x, placed.color.y, placed.color.z]);

      const mesh = new THREE.Mesh(bufGeom, mat);
      mesh.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation));
      vs.scene.add(mesh);
      vs.meshMap.set(mesh, expressID);
      geom.delete();
    }
  }

  // Извлечь IFC PropertySets и слои для всех элементов перед закрытием модели
  buildIfcPropertiesMap(ifcApi, modelId, vs);
  buildLayerMap(ifcApi, modelId, vs);

  ifcApi.CloseModel(modelId);
}
