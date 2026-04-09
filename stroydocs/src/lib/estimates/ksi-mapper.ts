import { db } from '@/lib/db';
import type { ParsedEstimateItem } from './types';
import { EstimateItemStatus } from '@prisma/client';
import { logger } from '@/lib/logger';

interface KsiNodeInfo {
  id: string;
  code: string;
  name: string;
  nameLower: string;
  keywords: string[];
}

/** Стоп-слова, которые не учитываются при сопоставлении */
const STOP_WORDS = new Set([
  'работы', 'работ', 'устройство', 'выполнение', 'монтаж', 'демонтаж',
  'прокладка', 'установка', 'подготовка', 'для', 'при', 'без', 'или',
]);

/** Результат маппинга одной позиции */
export interface MappedItem {
  item: ParsedEstimateItem;
  ksiNodeId: string | null;
  status: EstimateItemStatus;
}

/** Автопривязка позиций сметы к узлам КСИ */
export async function mapItemsToKsi(
  items: ParsedEstimateItem[]
): Promise<MappedItem[]> {
  // Загружаем все leaf-ноды КСИ (у которых нет дочерних)
  const allNodes = await db.ksiNode.findMany({
    where: {
      children: { none: {} },
    },
    select: { id: true, code: true, name: true },
  });

  const ksiNodes: KsiNodeInfo[] = allNodes.map((node) => ({
    ...node,
    nameLower: node.name.toLowerCase(),
    keywords: extractKeywords(node.name),
  }));

  logger.info({ ksiNodesCount: ksiNodes.length }, 'КСИ-ноды загружены для маппинга');

  let mappedCount = 0;

  const results: MappedItem[] = items.map((item) => {
    const match = findBestKsiMatch(item.rawName, ksiNodes);

    if (match) {
      mappedCount++;
      return {
        item,
        ksiNodeId: match.id,
        status: EstimateItemStatus.MAPPED,
      };
    }

    return {
      item,
      ksiNodeId: null,
      status: EstimateItemStatus.UNMATCHED,
    };
  });

  logger.info(
    { total: items.length, mapped: mappedCount, unmatched: items.length - mappedCount },
    'КСИ-маппинг завершён'
  );

  return results;
}

/** Поиск лучшего совпадения КСИ для названия работы */
function findBestKsiMatch(
  workName: string,
  ksiNodes: KsiNodeInfo[]
): KsiNodeInfo | null {
  const nameLower = workName.toLowerCase();
  const workKeywords = extractKeywords(workName);

  // 1. Точное вхождение: название КСИ содержится в названии работы
  for (const node of ksiNodes) {
    if (nameLower.includes(node.nameLower)) {
      return node;
    }
  }

  // 2. Обратное вхождение: название работы содержится в названии КСИ
  for (const node of ksiNodes) {
    if (node.nameLower.includes(nameLower)) {
      return node;
    }
  }

  // 3. Совпадение ключевых слов — ищем максимальное пересечение
  if (workKeywords.length === 0) return null;

  let bestMatch: KsiNodeInfo | null = null;
  let bestScore = 0;

  for (const node of ksiNodes) {
    if (node.keywords.length === 0) continue;

    const overlap = workKeywords.filter((kw) =>
      node.keywords.some((nkw) => nkw.includes(kw) || kw.includes(nkw))
    ).length;

    // Нормализуем по минимальному количеству слов
    const score = overlap / Math.min(workKeywords.length, node.keywords.length);

    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = node;
    }
  }

  return bestMatch;
}

/** Извлечение значимых ключевых слов из строки */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^а-яёa-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}
