import { db } from '@/lib/db';
import { EstimateItem } from '@prisma/client';

export interface VersionInfo {
  id: string;
  name: string;
  totalAmount: number | null;
  totalLabor: number | null;
  totalMat: number | null;
}

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
  summary: {
    totalDiff: number;
    laborDiff: number;
    materialDiff: number;
  };
}

/** Поля, по которым определяем изменения позиций */
const COMPARE_FIELDS: (keyof EstimateItem)[] = [
  'name',
  'unit',
  'volume',
  'unitPrice',
  'totalPrice',
  'laborCost',
  'materialCost',
  'machineryCost',
  'itemType',
];

/**
 * Сравнивает две версии сметы, возвращая структуру диффа.
 *
 * Стратегия сопоставления позиций:
 * 1. По importItemId (если обе версии из одного импорта) — точное совпадение
 * 2. По name + unit — нечёткое совпадение для ручных позиций
 */
export async function compareVersions(
  v1Id: string,
  v2Id: string
): Promise<VersionCompareResult> {
  const [version1, version2] = await Promise.all([
    db.estimateVersion.findUniqueOrThrow({
      where: { id: v1Id },
      include: {
        chapters: {
          include: {
            items: { where: { isDeleted: false } },
          },
        },
      },
    }),
    db.estimateVersion.findUniqueOrThrow({
      where: { id: v2Id },
      include: {
        chapters: {
          include: {
            items: { where: { isDeleted: false } },
          },
        },
      },
    }),
  ]);

  // Плоские списки позиций из обеих версий
  const items1: EstimateItem[] = version1.chapters.flatMap((ch) => ch.items);
  const items2: EstimateItem[] = version2.chapters.flatMap((ch) => ch.items);

  // Индексируем v1 по importItemId и по name+unit
  const byImportId1 = new Map<string, EstimateItem>();
  const byNameUnit1 = new Map<string, EstimateItem>();
  for (const item of items1) {
    if (item.importItemId) byImportId1.set(item.importItemId, item);
    byNameUnit1.set(`${item.name}|${item.unit ?? ''}`, item);
  }

  const diff: VersionDiff = { added: [], removed: [], changed: [], unchanged: [] };
  const matchedIds1 = new Set<string>();

  for (const item2 of items2) {
    // Сопоставление: сначала по importItemId, затем по name+unit
    let item1: EstimateItem | undefined;
    if (item2.importItemId) {
      item1 = byImportId1.get(item2.importItemId);
    }
    if (!item1) {
      item1 = byNameUnit1.get(`${item2.name}|${item2.unit ?? ''}`);
    }

    if (!item1) {
      diff.added.push(item2);
    } else {
      matchedIds1.add(item1.id);
      // Определяем изменённые поля
      const changedFields = COMPARE_FIELDS.filter(
        (field) => item1![field] !== item2[field]
      );
      if (changedFields.length > 0) {
        diff.changed.push({ item1, item2, changedFields });
      } else {
        diff.unchanged.push(item2);
      }
    }
  }

  // Позиции из v1, которые не нашли пары в v2 — удалены
  for (const item1 of items1) {
    if (!matchedIds1.has(item1.id)) {
      diff.removed.push(item1);
    }
  }

  const v1Info: VersionInfo = {
    id: version1.id,
    name: version1.name,
    totalAmount: version1.totalAmount,
    totalLabor: version1.totalLabor,
    totalMat: version1.totalMat,
  };
  const v2Info: VersionInfo = {
    id: version2.id,
    name: version2.name,
    totalAmount: version2.totalAmount,
    totalLabor: version2.totalLabor,
    totalMat: version2.totalMat,
  };

  return {
    version1: v1Info,
    version2: v2Info,
    diff,
    summary: {
      totalDiff: (v2Info.totalAmount ?? 0) - (v1Info.totalAmount ?? 0),
      laborDiff: (v2Info.totalLabor ?? 0) - (v1Info.totalLabor ?? 0),
      materialDiff: (v2Info.totalMat ?? 0) - (v1Info.totalMat ?? 0),
    },
  };
}
