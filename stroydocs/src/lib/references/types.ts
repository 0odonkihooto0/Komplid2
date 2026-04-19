export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea'
  | 'color'
  | 'date';

export interface ReferenceFieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  hiddenByDefault?: boolean;
  readonly?: boolean;
  width?: number;
  /** Поле не рендерится в таблице и форме, но принимается API (parentId, level) */
  hidden?: boolean;
}

export interface ReferenceSchema {
  slug: string;
  name: string;
  pluralName: string;
  nameSingular: string;
  category: 'common' | 'construction' | 'financial' | 'documentary';
  model: string;
  fields: ReferenceFieldSchema[];
  adminOnly?: boolean;
  scope: 'system' | 'organization';
  auditable?: boolean;
  /** Краткое описание для карточки на /references */
  description?: string;
  /** Имя lucide-иконки (строка, резолвится в ICON_MAP на клиенте) */
  icon?: string;
  /** Отображать справочник как дерево (tree-table) */
  hierarchical?: boolean;
  /** Имя поля родительской записи, например 'parentId' */
  parentKey?: string;
  /** При true — всегда использовать серверную пагинацию (не загружать все сразу).
   *  Применяется для больших иерархических справочников (КСИ 1000+ записей). */
  lazyLoad?: boolean;
  /** Поле для сортировки по умолчанию. Если не задано — используется 'createdAt'. */
  defaultSort?: string;
}
