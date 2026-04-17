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
}
