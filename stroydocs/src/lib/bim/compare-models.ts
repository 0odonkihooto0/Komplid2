/**
 * Утилита сравнения двух ТИМ-моделей по элементам.
 * Сопоставление — по ifcGuid (глобальный идентификатор IFC, уникален в рамках модели).
 * Используется для анализа изменений между версиями модели.
 */

export interface BimElementSummary {
  id: string;
  ifcGuid: string;
  ifcType: string;
  name: string | null;
  layer: string | null;
  level: string | null;
}

export interface ModifiedElement {
  elementA: BimElementSummary;
  elementB: BimElementSummary;
  /** Список имён изменённых полей */
  changes: string[];
}

export interface BimModelDiff {
  /** Элементы в модели B, отсутствующие в A */
  added: BimElementSummary[];
  /** Элементы в модели A, отсутствующие в B */
  removed: BimElementSummary[];
  /** Элементы с совпадающим ifcGuid, но изменёнными атрибутами */
  modified: ModifiedElement[];
  /** Элементы без изменений */
  unchanged: BimElementSummary[];
  stats: {
    totalA: number;
    totalB: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

/**
 * Сравнивает два набора элементов ТИМ-моделей.
 * Сопоставление по ifcGuid — стабильный глобальный идентификатор IFC.
 */
export function compareModels(
  elementsA: BimElementSummary[],
  elementsB: BimElementSummary[]
): BimModelDiff {
  const added: BimElementSummary[] = [];
  const removed: BimElementSummary[] = [];
  const modified: ModifiedElement[] = [];
  const unchanged: BimElementSummary[] = [];

  // Индекс модели B по ifcGuid для O(1) поиска
  const bByGuid = new Map<string, BimElementSummary>();
  for (const el of elementsB) {
    bByGuid.set(el.ifcGuid, el);
  }

  const matchedGuids = new Set<string>();

  for (const elA of elementsA) {
    const elB = bByGuid.get(elA.ifcGuid);

    if (!elB) {
      removed.push(elA);
      continue;
    }

    matchedGuids.add(elA.ifcGuid);

    // Определяем изменённые поля атрибутов
    const changes: string[] = [];
    if (elA.ifcType !== elB.ifcType) changes.push('ifcType');
    if (elA.name !== elB.name) changes.push('name');
    if (elA.layer !== elB.layer) changes.push('layer');
    if (elA.level !== elB.level) changes.push('level');

    if (changes.length > 0) {
      modified.push({ elementA: elA, elementB: elB, changes });
    } else {
      unchanged.push(elA);
    }
  }

  // Элементы в B, которых нет в A — добавленные
  for (const elB of elementsB) {
    if (!matchedGuids.has(elB.ifcGuid)) {
      added.push(elB);
    }
  }

  return {
    added,
    removed,
    modified,
    unchanged,
    stats: {
      totalA: elementsA.length,
      totalB: elementsB.length,
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      unchangedCount: unchanged.length,
    },
  };
}
