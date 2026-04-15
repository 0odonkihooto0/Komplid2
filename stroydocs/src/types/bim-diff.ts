/**
 * Типы для результата сравнения IFC-версий через IfcOpenShell ifcdiff.
 * Используются в API роуте /bim/models/[modelId]/diff и компонентах VersionDiffViewer.
 */

/** Элемент diff — добавленный, удалённый или с изменённой геометрией */
export interface IfcDiffElement {
  guid: string;
  name: string | null;
  ifcType: string | null;
}

/** Элемент diff с изменёнными атрибутами */
export interface IfcDiffChangedElement extends IfcDiffElement {
  changedAttributes: string[];
}

/** Полный результат сравнения двух IFC-версий через ifcdiff */
export interface IfcDiffResult {
  /** Элементы присутствующие в новой версии, отсутствующие в старой */
  added: IfcDiffElement[];
  /** Элементы присутствующие в старой версии, отсутствующие в новой */
  deleted: IfcDiffElement[];
  /** Элементы с изменёнными атрибутами (Name, Description, ObjectType, PredefinedType) */
  changed: IfcDiffChangedElement[];
  /** Элементы с изменённой геометрией (Representation) */
  geometryChanged: IfcDiffElement[];
}
