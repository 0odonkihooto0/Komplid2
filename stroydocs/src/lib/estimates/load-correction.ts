import { db } from '@/lib/db';
import type { EstimateVersion } from '@prisma/client';
import { logger } from '@/lib/logger';
import { detectFormatByMime } from './detect-format';
import { parseXmlEstimate } from './parsers/xml-parser';
import { recalculateVersion } from './recalculate';
import type { ParsedEstimateItem } from './types';

/**
 * Загружает корректировочную смету из файла.
 * Парсит файл, сопоставляет позиции с родительской версией,
 * создаёт EstimateVersion(CORRECTIVE) с parentVersionId.
 */
export async function loadCorrectionFromFile(
  parentVersionId: string,
  buffer: Buffer,
  fileName: string,
  contractId: string,
  userId: string
): Promise<EstimateVersion> {
  const format = detectFormatByMime(fileName, '');
  if (!format) {
    throw new Error(`Неподдерживаемый формат файла: ${fileName}`);
  }

  logger.info({ parentVersionId, fileName, format }, 'Загрузка корректировочной сметы');

  // Парсим файл
  const parseResult = await parseXmlEstimate(buffer);
  if (parseResult.items.length === 0) {
    throw new Error('Файл не содержит позиций сметы');
  }

  // Загружаем родительскую версию с позициями
  const parent = await db.estimateVersion.findUniqueOrThrow({
    where: { id: parentVersionId },
    include: {
      chapters: {
        orderBy: { order: 'asc' },
        include: { items: { where: { isDeleted: false }, orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  // Индексируем позиции родителя для сопоставления
  const parentItems = parent.chapters.flatMap((ch) =>
    ch.items.map((item) => ({ item, chapter: ch }))
  );
  const bySortOrder = new Map<number, typeof parentItems[0]>();
  const byNameUnit = new Map<string, typeof parentItems[0]>();
  for (const pi of parentItems) {
    bySortOrder.set(pi.item.sortOrder, pi);
    byNameUnit.set(`${pi.item.name}|${pi.item.unit ?? ''}`, pi);
  }

  // Сопоставляем parsed items с родительскими
  const matched: Array<{ parsed: ParsedEstimateItem; parentChapterName: string }> = [];
  const unmatched: ParsedEstimateItem[] = [];

  for (const parsed of parseResult.items) {
    // Приоритет 1: по sortOrder
    let match = bySortOrder.get(parsed.sortOrder);
    // Приоритет 2: по имени + единице измерения
    if (!match) {
      match = byNameUnit.get(`${parsed.rawName}|${parsed.rawUnit ?? ''}`);
    }
    if (match) {
      matched.push({ parsed, parentChapterName: match.chapter.name });
    } else {
      unmatched.push(parsed);
    }
  }

  // Создаём корректировочную версию в транзакции
  const newVersion = await db.$transaction(async (tx) => {
    const version = await tx.estimateVersion.create({
      data: {
        name: `Корректировка: ${parent.name} (${new Date().toLocaleDateString('ru-RU')})`,
        versionType: 'CORRECTIVE',
        isBaseline: false,
        isActual: false,
        parentVersionId,
        contractId,
        createdById: userId,
      },
    });

    // Копируем структуру глав из родителя, заполняем позициями из корректировки
    const chapterNameMap = new Map<string, string>(); // parentChapterName → newChapterId
    for (const parentChapter of parent.chapters) {
      const ch = await tx.estimateChapter.create({
        data: {
          code: parentChapter.code,
          name: parentChapter.name,
          order: parentChapter.order,
          level: parentChapter.level,
          versionId: version.id,
        },
      });
      chapterNameMap.set(parentChapter.name, ch.id);
    }

    // Вставляем сопоставленные позиции
    const matchedData = matched
      .map(({ parsed, parentChapterName }) => {
        const chapterId = chapterNameMap.get(parentChapterName);
        if (!chapterId) return null;
        return {
          sortOrder: parsed.sortOrder,
          itemType: parsed.itemType,
          name: parsed.rawName,
          unit: parsed.rawUnit,
          volume: parsed.volume,
          unitPrice: parsed.price,
          totalPrice: parsed.total,
          chapterId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (matchedData.length > 0) {
      await tx.estimateItem.createMany({ data: matchedData });
    }

    // Новые позиции без соответствия — в первую главу
    if (unmatched.length > 0) {
      const firstChapterId = chapterNameMap.values().next().value;
      if (firstChapterId) {
        const unmatchedData = unmatched.map((parsed) => ({
          sortOrder: parsed.sortOrder,
          itemType: parsed.itemType,
          name: parsed.rawName,
          unit: parsed.rawUnit,
          volume: parsed.volume,
          unitPrice: parsed.price,
          totalPrice: parsed.total,
          chapterId: firstChapterId,
        }));
        await tx.estimateItem.createMany({ data: unmatchedData });
      }
    }

    return version;
  });

  // Пересчитываем итоги
  await recalculateVersion(newVersion.id);

  logger.info(
    { newVersionId: newVersion.id, matched: matched.length, unmatched: unmatched.length },
    'Корректировочная версия создана'
  );

  return newVersion;
}
