/**
 * displayModes.ts — утилиты для режимов отображения 3D-модели в ТИМ-вьюере.
 *
 * Режимы: оригинальные цвета / каркас / рентген / цвет по типу IFC (ЦУС стр. 302).
 * Все apply-функции — чистые, работают напрямую с ViewerScene (ссылкой на материалы).
 */

import type { ViewerScene } from './ifcSceneSetup';

export type DisplayMode = 'default' | 'wireframe' | 'xray' | 'byType';

/** Цвета по IFC-типу элемента (из задания: ЦУС стр. 302) */
export const IFC_TYPE_COLORS: Record<string, number> = {
  IfcWall: 0x9e9e9e, // серый
  IfcSlab: 0x78909c, // синевато-серый
  IfcColumn: 0xef5350, // красный
  IfcBeam: 0xffa726, // оранжевый
  IfcWindow: 0x42a5f5, // голубой
  IfcDoor: 0x8d6e63, // коричневый
  IfcStair: 0xab47bc, // фиолетовый
  IfcRoof: 0x66bb6a, // зелёный
};

/** Дефолтный цвет для элементов с типом, которого нет в словаре */
export const IFC_TYPE_DEFAULT_COLOR = 0xbdbdbd;

/** Русские названия для легенды */
export const IFC_TYPE_LABELS: Record<string, string> = {
  IfcWall: 'Стены',
  IfcSlab: 'Перекрытия',
  IfcColumn: 'Колонны',
  IfcBeam: 'Балки',
  IfcWindow: 'Окна',
  IfcDoor: 'Двери',
  IfcStair: 'Лестницы',
  IfcRoof: 'Кровля',
};

/** Цвет эмиссионной подсветки выбранного элемента (единый для всех режимов) */
const SELECTED_EMISSIVE = 0x60a5fa;
/** Прозрачность не выбранных элементов в X-Ray */
const XRAY_DIM_OPACITY = 0.15;

/** Применяет/сбрасывает эмиссию выбранного элемента (единая подсветка во всех режимах) */
function applySelection(vs: ViewerScene, selectedGuid: string | null): void {
  vs.materials.forEach((mat, guid) => {
    mat.emissive.setHex(guid === selectedGuid ? SELECTED_EMISSIVE : 0x000000);
    mat.needsUpdate = true;
  });
}

/**
 * Восстановить оригинальные цвета и прозрачность из GLB-материалов.
 * Используется при выходе из любого нестандартного режима.
 */
function resetMaterials(vs: ViewerScene): void {
  vs.materials.forEach((mat, guid) => {
    mat.wireframe = false;
    const orig = vs.originalColors.get(guid);
    if (orig) mat.color.setRGB(orig[0], orig[1], orig[2]);
    const origOpacity = vs.originalOpacity.get(guid) ?? 1;
    mat.opacity = origOpacity;
    mat.transparent = origOpacity < 1;
    mat.depthWrite = origOpacity >= 1;
    mat.emissive.setHex(0x000000);
    mat.needsUpdate = true;
  });
}

/** Оригинальные цвета IFC, без каркаса и прозрачности */
export function applyDefault(vs: ViewerScene, selectedGuid: string | null): void {
  resetMaterials(vs);
  vs.wireframe = false;
  applySelection(vs, selectedGuid);
}

/** Все меши — в режиме wireframe, цвета оригинальные */
export function applyWireframe(vs: ViewerScene, selectedGuid: string | null): void {
  resetMaterials(vs);
  vs.materials.forEach((mat) => {
    mat.wireframe = true;
    mat.needsUpdate = true;
  });
  vs.wireframe = true;
  applySelection(vs, selectedGuid);
}

/**
 * Рентген: все меши полупрозрачные (0.15), выбранный — непрозрачный с эмиссионной подсветкой.
 * Если выбранного нет — вся модель прозрачная (режим обзора внутренностей).
 */
export function applyXRay(vs: ViewerScene, selectedGuid: string | null): void {
  vs.wireframe = false;
  vs.materials.forEach((mat, guid) => {
    mat.wireframe = false;
    const orig = vs.originalColors.get(guid);
    if (orig) mat.color.setRGB(orig[0], orig[1], orig[2]);

    if (guid === selectedGuid) {
      mat.opacity = 1;
      mat.transparent = false;
      mat.depthWrite = true;
      mat.emissive.setHex(SELECTED_EMISSIVE);
    } else {
      mat.opacity = XRAY_DIM_OPACITY;
      mat.transparent = true;
      mat.depthWrite = false;
      mat.emissive.setHex(0x000000);
    }
    mat.needsUpdate = true;
  });
}

/**
 * Окрашивание по типу IFC. Тип берётся из typeMap (guid → ifcType),
 * которую нужно заранее подтянуть с API /element-types.
 */
export function applyByType(
  vs: ViewerScene,
  typeMap: Map<string, string>,
  selectedGuid: string | null,
): void {
  vs.wireframe = false;
  vs.materials.forEach((mat, guid) => {
    mat.wireframe = false;
    const ifcType = typeMap.get(guid);
    const colorHex = ifcType
      ? IFC_TYPE_COLORS[ifcType] ?? IFC_TYPE_DEFAULT_COLOR
      : IFC_TYPE_DEFAULT_COLOR;
    mat.color.setHex(colorHex);
    const origOpacity = vs.originalOpacity.get(guid) ?? 1;
    mat.opacity = origOpacity;
    mat.transparent = origOpacity < 1;
    mat.depthWrite = origOpacity >= 1;
    mat.emissive.setHex(guid === selectedGuid ? SELECTED_EMISSIVE : 0x000000);
    mat.needsUpdate = true;
  });
}
