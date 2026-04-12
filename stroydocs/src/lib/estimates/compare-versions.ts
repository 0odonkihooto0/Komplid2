import { db } from '@/lib/db';
import type { EstimateItem } from '@prisma/client';
import type { CompareMode } from '@/lib/validations/estimate';
import { formatDefault, formatVolumes, formatCost, formatContract } from './compare-formatters';

export interface VersionInfo {
  id: string;
  name: string;
  totalAmount: number | null;
  totalLabor: number | null;
  totalMat: number | null;
}

export interface CompareResultItem {
  itemV1: EstimateItem | null;
  itemV2: EstimateItem | null;
  status: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';
  delta: { volume: number; unitPrice: number; totalPrice: number };
  chapterV1?: { id: string; name: string };
  chapterV2?: { id: string; name: string };
}

/** Обратно-совместимый тип (для фронтенда, использующего старый формат) */
export interface ChangedItem {
  item1: EstimateItem;
  item2: EstimateItem;
  changedFields: string[];
}

export interface VersionDiff {
  added: EstimateItem[];
  removed: EstimateItem[];
  changed: ChangedItem[];
  unchanged: EstimateItem[];
}

export interface VersionCompareResult {
  version1: VersionInfo;
  version2: VersionInfo;
  diff: VersionDiff;
  items: CompareResultItem[];
  summary: {
    totalDiff: number;
    laborDiff: number;
    materialDiff: number;
  };
  // Форматированный результат по режиму (volumes, cost, contract)
  formatted?: unknown;
}

/** Поля, по которым определяем изменения позиций */
const COMPARE_FIELDS: (keyof EstimateItem)[] = [
  'name', 'unit', 'volume', 'unitPrice', 'totalPrice',
  'laborCost', 'materialCost', 'machineryCost', 'itemType',
];

interface ItemWithChapter {
  item: EstimateItem;
  chapter: { id: string; name: string };
}

/**
 * Сравнивает две версии сметы.
 *
 * Стратегия сопоставления позиций:
 * 1. По sortOrder + code (если оба code !== null) — для позиций из нормативов
 * 2. По importItemId — для версий из одного импорта
 * 3. По name + unit — нечёткое совпадение
 */
export async function compareVersions(
  v1Id: string,
  v2Id: string,
  mode: CompareMode = 'default'
): Promise<VersionCompareResult> {
  const [version1, version2] = await Promise.all([
    db.estimateVersion.findUniqueOrThrow({
      where: { id: v1Id },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: { items: { where: { isDeleted: false }, orderBy: { sortOrder: 'asc' } } },
        },
      },
    }),
    db.estimateVersion.findUniqueOrThrow({
      where: { id: v2Id },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: { items: { where: { isDeleted: false }, orderBy: { sortOrder: 'asc' } } },
        },
      },
    }),
  ]);

  // Плоские списки позиций с контекстом главы
  const withChapter1: ItemWithChapter[] = version1.chapters.flatMap((ch) =>
    ch.items.map((item) => ({ item, chapter: { id: ch.id, name: ch.name } }))
  );
  const withChapter2: ItemWithChapter[] = version2.chapters.flatMap((ch) =>
    ch.items.map((item) => ({ item, chapter: { id: ch.id, name: ch.name } }))
  );

  // Индексы для сопоставления v1
  const bySortCode1 = new Map<string, ItemWithChapter>();
  const byImportId1 = new Map<string, ItemWithChapter>();
  const byNameUnit1 = new Map<string, ItemWithChapter>();

  for (const wc of withChapter1) {
    if (wc.item.code) bySortCode1.set(`${wc.item.sortOrder}|${wc.item.code}`, wc);
    if (wc.item.importItemId) byImportId1.set(wc.item.importItemId, wc);
    byNameUnit1.set(`${wc.item.name}|${wc.item.unit ?? ''}`, wc);
  }

  const resultItems: CompareResultItem[] = [];
  const diff: VersionDiff = { added: [], removed: [], changed: [], unchanged: [] };
  const matchedIds1 = new Set<string>();

  for (const wc2 of withChapter2) {
    const { item: item2 } = wc2;
    let matched: ItemWithChapter | undefined;

    // Приоритет 1: sortOrder + code
    if (item2.code) {
      matched = bySortCode1.get(`${item2.sortOrder}|${item2.code}`);
    }
    // Приоритет 2: importItemId
    if (!matched && item2.importItemId) {
      matched = byImportId1.get(item2.importItemId);
    }
    // Приоритет 3: name + unit
    if (!matched) {
      matched = byNameUnit1.get(`${item2.name}|${item2.unit ?? ''}`);
    }

    if (!matched) {
      diff.added.push(item2);
      resultItems.push({
        itemV1: null, itemV2: item2,
        status: 'ADDED',
        delta: { volume: item2.volume ?? 0, unitPrice: item2.unitPrice ?? 0, totalPrice: item2.totalPrice ?? 0 },
        chapterV2: wc2.chapter,
      });
    } else {
      matchedIds1.add(matched.item.id);
      const changedFields = COMPARE_FIELDS.filter((f) => matched!.item[f] !== item2[f]);
      const status = changedFields.length > 0 ? 'CHANGED' : 'UNCHANGED';
      const delta = {
        volume: (item2.volume ?? 0) - (matched.item.volume ?? 0),
        unitPrice: (item2.unitPrice ?? 0) - (matched.item.unitPrice ?? 0),
        totalPrice: (item2.totalPrice ?? 0) - (matched.item.totalPrice ?? 0),
      };

      if (status === 'CHANGED') {
        diff.changed.push({ item1: matched.item, item2, changedFields });
      } else {
        diff.unchanged.push(item2);
      }
      resultItems.push({
        itemV1: matched.item, itemV2: item2, status, delta,
        chapterV1: matched.chapter, chapterV2: wc2.chapter,
      });
    }
  }

  // Позиции из v1 без пары — удалены
  for (const wc1 of withChapter1) {
    if (!matchedIds1.has(wc1.item.id)) {
      diff.removed.push(wc1.item);
      resultItems.push({
        itemV1: wc1.item, itemV2: null,
        status: 'REMOVED',
        delta: {
          volume: -(wc1.item.volume ?? 0),
          unitPrice: -(wc1.item.unitPrice ?? 0),
          totalPrice: -(wc1.item.totalPrice ?? 0),
        },
        chapterV1: wc1.chapter,
      });
    }
  }

  const v1Info: VersionInfo = {
    id: version1.id, name: version1.name,
    totalAmount: version1.totalAmount, totalLabor: version1.totalLabor, totalMat: version1.totalMat,
  };
  const v2Info: VersionInfo = {
    id: version2.id, name: version2.name,
    totalAmount: version2.totalAmount, totalLabor: version2.totalLabor, totalMat: version2.totalMat,
  };
  const summary = {
    totalDiff: (v2Info.totalAmount ?? 0) - (v1Info.totalAmount ?? 0),
    laborDiff: (v2Info.totalLabor ?? 0) - (v1Info.totalLabor ?? 0),
    materialDiff: (v2Info.totalMat ?? 0) - (v1Info.totalMat ?? 0),
  };

  // Форматирование по режиму
  let formatted: unknown;
  switch (mode) {
    case 'volumes': formatted = formatVolumes(resultItems); break;
    case 'cost': formatted = formatCost(resultItems); break;
    case 'contract': formatted = formatContract(v1Info, v2Info, summary); break;
    default: formatted = formatDefault(resultItems); break;
  }

  return { version1: v1Info, version2: v2Info, diff, items: resultItems, summary, formatted };
}
