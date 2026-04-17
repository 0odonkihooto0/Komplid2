import type { EstimateItem } from '@prisma/client';
import type { VersionInfo, CompareResultItem } from './compare-versions';

/** Формат по умолчанию: плоский список с дельтами */
export function formatDefault(items: CompareResultItem[]) {
  return { items };
}

/** Группировка по главам, показывает Δ объёмов */
export function formatVolumes(items: CompareResultItem[]) {
  const chapterMap = new Map<string, {
    chapterId: string;
    chapterName: string;
    items: Array<{
      name: string;
      unit: string | null;
      volumeV1: number;
      volumeV2: number;
      delta: number;
      status: CompareResultItem['status'];
    }>;
  }>();

  for (const row of items) {
    const item = row.itemV2 ?? row.itemV1;
    if (!item) continue;

    const chapter = row.chapterV2 ?? row.chapterV1;
    const key = chapter?.id ?? 'unknown';
    if (!chapterMap.has(key)) {
      chapterMap.set(key, {
        chapterId: key,
        chapterName: chapter?.name ?? 'Без раздела',
        items: [],
      });
    }

    chapterMap.get(key)!.items.push({
      name: item.name,
      unit: item.unit,
      volumeV1: row.itemV1?.volume ?? 0,
      volumeV2: row.itemV2?.volume ?? 0,
      delta: row.delta.volume,
      status: row.status,
    });
  }

  return { chapters: Array.from(chapterMap.values()) };
}

/** Группировка по элементам затрат: СР, МР, Оборудование, Прочие */
export function formatCost(items: CompareResultItem[]) {
  const sum = (arr: CompareResultItem[], getter: (item: EstimateItem) => number) => ({
    v1: arr.reduce((s, r) => s + (r.itemV1 ? getter(r.itemV1) : 0), 0),
    v2: arr.reduce((s, r) => s + (r.itemV2 ? getter(r.itemV2) : 0), 0),
    delta: arr.reduce((s, r) => s + (r.itemV2 ? getter(r.itemV2) : 0) - (r.itemV1 ? getter(r.itemV1) : 0), 0),
  });

  const labor = sum(items, (i) => i.laborCost ?? 0);
  const material = sum(items, (i) => i.materialCost ?? 0);
  const machinery = sum(items, (i) => i.machineryCost ?? 0);

  // Прочие = totalPrice - (СР + МР + Оборудование)
  const other = sum(items, (i) =>
    (i.totalPrice ?? 0) - (i.laborCost ?? 0) - (i.materialCost ?? 0) - (i.machineryCost ?? 0)
  );

  return {
    costElements: { labor, material, machinery, other },
    items,
  };
}

/** Суммарное сравнение на уровне контракта */
export function formatContract(
  version1: VersionInfo,
  version2: VersionInfo,
  summary: { totalDiff: number; laborDiff: number; materialDiff: number }
) {
  return { version1, version2, summary };
}
