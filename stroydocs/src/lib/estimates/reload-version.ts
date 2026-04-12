import { db } from '@/lib/db';
import type { EstimateVersion } from '@prisma/client';
import { logger } from '@/lib/logger';
import { recalculateVersion } from './recalculate';

/**
 * Перезагружает версию сметы из исходного файла импорта.
 * Удаляет все главы и позиции, пересоздаёт из EstimateImportItem.
 */
export async function reloadVersionFromImport(versionId: string): Promise<EstimateVersion> {
  const version = await db.estimateVersion.findUniqueOrThrow({
    where: { id: versionId },
  });

  if (!version.sourceImportId) {
    throw new Error('Версия не привязана к импорту — перезагрузка невозможна');
  }

  if (version.isBaseline) {
    throw new Error('Нельзя перезагрузить базовую версию');
  }

  logger.info({ versionId, sourceImportId: version.sourceImportId }, 'Перезагрузка версии из импорта');

  const importData = await db.estimateImport.findUniqueOrThrow({
    where: { id: version.sourceImportId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  const allItems = importData.items;
  const hasHierarchy = allItems.some((item) => item.parentItemId !== null);
  const totalAmount = allItems.reduce((sum, item) => sum + (item.total ?? 0), 0);

  const updated = await db.$transaction(async (tx) => {
    // Каскадное удаление: главы → позиции (onDelete: Cascade в EstimateItem)
    await tx.estimateChapter.deleteMany({ where: { versionId } });

    if (hasHierarchy) {
      // Иерархическая структура: корневые → главы, дочерние → позиции
      const rootItems = allItems.filter((item) => item.parentItemId === null);
      const childItemsByParent = new Map<string, typeof allItems>();
      for (const item of allItems) {
        if (item.parentItemId !== null) {
          const group = childItemsByParent.get(item.parentItemId) ?? [];
          group.push(item);
          childItemsByParent.set(item.parentItemId, group);
        }
      }

      for (const [chapterIdx, rootItem] of Array.from(rootItems.entries())) {
        const children = childItemsByParent.get(rootItem.id) ?? [];
        const chapterTotal = children.reduce((sum, child) => sum + (child.total ?? 0), 0);

        const chapter = await tx.estimateChapter.create({
          data: {
            code: String(chapterIdx + 1),
            name: rootItem.rawName,
            order: chapterIdx,
            level: 0,
            versionId,
            totalAmount: chapterTotal || null,
          },
        });

        if (children.length > 0) {
          await tx.estimateItem.createMany({
            data: children.map((child, itemIdx) => ({
              sortOrder: itemIdx,
              itemType: child.itemType,
              name: child.rawName,
              unit: child.rawUnit ?? null,
              volume: child.volume ?? null,
              unitPrice: child.price ?? null,
              totalPrice: child.total ?? null,
              ksiNodeId: child.suggestedKsiNodeId ?? null,
              importItemId: child.id,
              chapterId: chapter.id,
            })),
          });
        }
      }
    } else {
      // Плоская структура: один чаптер для всех позиций
      const chapter = await tx.estimateChapter.create({
        data: {
          code: '1',
          name: 'Сметные позиции',
          order: 0,
          level: 0,
          versionId,
          totalAmount: totalAmount || null,
        },
      });

      await tx.estimateItem.createMany({
        data: allItems.map((item, itemIdx) => ({
          sortOrder: itemIdx,
          itemType: item.itemType,
          name: item.rawName,
          unit: item.rawUnit ?? null,
          volume: item.volume ?? null,
          unitPrice: item.price ?? null,
          totalPrice: item.total ?? null,
          ksiNodeId: item.suggestedKsiNodeId ?? null,
          importItemId: item.id,
          chapterId: chapter.id,
        })),
      });
    }

    // Обновляем итоги версии
    return tx.estimateVersion.update({
      where: { id: versionId },
      data: { totalAmount, status: 'OK' },
    });
  });

  // Полный пересчёт итогов
  await recalculateVersion(versionId);

  logger.info({ versionId, itemCount: allItems.length }, 'Версия перезагружена из импорта');
  return updated;
}
