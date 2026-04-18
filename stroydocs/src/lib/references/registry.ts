import type { ReferenceSchema } from './types';

export const REFERENCE_REGISTRY: Record<string, ReferenceSchema> = {
  currencies: {
    slug: 'currencies',
    name: 'Валюты',
    pluralName: 'Валюты',
    nameSingular: 'валюту',
    category: 'financial',
    model: 'currency',
    scope: 'organization',
    auditable: true,
    fields: [
      { key: 'name',        label: 'Наименование',         type: 'string',  required: true,  width: 180 },
      { key: 'shortName',   label: 'Буквенный код',        type: 'string',  required: true,  width: 100 },
      { key: 'shortSymbol', label: 'Символ',               type: 'string',  required: true,  width: 80  },
      { key: 'code',        label: 'ISO 4217 (буквенный)', type: 'string',  required: true,  width: 120 },
      { key: 'numericCode', label: 'ISO 4217 (цифровой)',  type: 'string',  required: false, width: 120 },
      { key: 'fullName',    label: 'Полное наименование',  type: 'string',  required: false, width: 220 },
      { key: 'englishName', label: 'Наименование (англ.)', type: 'string',  required: false, width: 200, hiddenByDefault: true },
      { key: 'caseForm',    label: 'Форма склонения',      type: 'string',  required: false, width: 180, hiddenByDefault: true },
      { key: 'isSystem',    label: 'Системная',            type: 'boolean', required: false, readonly: true, hiddenByDefault: true },
    ],
  },

  budgetTypes: {
    slug: 'budgetTypes',
    name: 'Типы бюджета',
    pluralName: 'Типы бюджета',
    nameSingular: 'тип бюджета',
    category: 'financial',
    model: 'budgetType',
    scope: 'organization',
    auditable: true,
    fields: [
      { key: 'name',     label: 'Наименование', type: 'string',  required: true,  width: 240 },
      { key: 'code',     label: 'Код',          type: 'string',  required: true,  width: 140 },
      { key: 'color',    label: 'Цвет',         type: 'color',   required: false, width: 100 },
      { key: 'order',    label: 'Порядок',      type: 'number',  required: false, width: 100, hiddenByDefault: true },
      { key: 'isSystem', label: 'Системный',    type: 'boolean', required: false, readonly: true, hiddenByDefault: true },
    ],
  },

  measurementUnits: {
    slug: 'measurementUnits',
    name: 'Единицы измерения',
    pluralName: 'Единицы измерения',
    nameSingular: 'единицу измерения',
    category: 'common',
    model: 'measurementUnitRef',
    scope: 'organization',
    auditable: true,
    fields: [
      { key: 'name',      label: 'Наименование',      type: 'string',  required: true,  width: 200 },
      { key: 'shortName', label: 'Обозначение',       type: 'string',  required: true,  width: 120 },
      { key: 'category',  label: 'Категория',         type: 'string',  required: false, width: 160 },
      { key: 'ruCode',    label: 'Код ОКЕИ',          type: 'string',  required: false, width: 100 },
      { key: 'intCode',   label: 'Международный код', type: 'string',  required: false, width: 140, hiddenByDefault: true },
      { key: 'isSystem',  label: 'Системная',         type: 'boolean', required: false, readonly: true, hiddenByDefault: true },
    ],
  },

  declensionCases: {
    slug: 'declensionCases',
    name: 'Падежи',
    pluralName: 'Падежи',
    nameSingular: 'падеж',
    category: 'common',
    model: 'declensionCase',
    scope: 'system',
    adminOnly: true,
    auditable: true,
    fields: [
      { key: 'name',      label: 'Наименование', type: 'string',  required: true,  width: 180 },
      { key: 'shortName', label: 'Краткое',      type: 'string',  required: true,  width: 100 },
      { key: 'order',     label: 'Порядок',      type: 'number',  required: false, width: 100 },
      { key: 'isSystem',  label: 'Системный',    type: 'boolean', required: false, readonly: true, hiddenByDefault: true },
    ],
  },
};

export function getReferenceSchema(slug: string): ReferenceSchema | null {
  return REFERENCE_REGISTRY[slug] ?? null;
}

export function listReferenceSchemas(): ReferenceSchema[] {
  return Object.values(REFERENCE_REGISTRY);
}
