import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Пересчитывает итоги версии сметы:
 * 1. totalPrice = volume × unitPrice для каждой позиции
 * 2. totalAmount по каждой главе (сумма позиций главы)
 * 3. totalAmount по версии (сумма по всем главам)
 *
 * Вызывается после создания/редактирования позиций и при явном запросе пересчёта.
 */
export async function recalculateVersion(versionId: string): Promise<void> {
  logger.info({ versionId }, 'Пересчёт итогов версии сметы');

  // Загружаем все активные позиции версии с их главами
  const items = await db.estimateItem.findMany({
    where: { chapter: { versionId }, isDeleted: false },
    select: {
      id: true,
      volume: true,
      unitPrice: true,
      laborCost: true,
      materialCost: true,
      chapterId: true,
    },
  });

  // Пересчитываем totalPrice для каждой позиции
  await db.$transaction(
    items.map((item) =>
      db.estimateItem.update({
        where: { id: item.id },
        data: {
          totalPrice: (item.volume ?? 0) * (item.unitPrice ?? 0),
        },
      })
    )
  );

  // Агрегируем по главам
  const chapters = await db.estimateChapter.findMany({
    where: { versionId },
    select: { id: true },
  });

  // Для каждой главы считаем сумму её позиций
  const itemsByChapter = new Map<string, { total: number; labor: number; mat: number }>();
  for (const item of items) {
    const current = itemsByChapter.get(item.chapterId) ?? { total: 0, labor: 0, mat: 0 };
    current.total += (item.volume ?? 0) * (item.unitPrice ?? 0);
    current.labor += item.laborCost ?? 0;
    current.mat += item.materialCost ?? 0;
    itemsByChapter.set(item.chapterId, current);
  }

  await db.$transaction(
    chapters.map((chapter) => {
      const agg = itemsByChapter.get(chapter.id) ?? { total: 0, labor: 0, mat: 0 };
      return db.estimateChapter.update({
        where: { id: chapter.id },
        data: {
          totalAmount: agg.total,
          totalLabor: agg.labor,
          totalMat: agg.mat,
        },
      });
    })
  );

  // Агрегируем по версии
  const versionTotal = items.reduce(
    (acc, item) => {
      acc.total += (item.volume ?? 0) * (item.unitPrice ?? 0);
      acc.labor += item.laborCost ?? 0;
      acc.mat += item.materialCost ?? 0;
      return acc;
    },
    { total: 0, labor: 0, mat: 0 }
  );

  await db.estimateVersion.update({
    where: { id: versionId },
    data: {
      totalAmount: versionTotal.total,
      totalLabor: versionTotal.labor,
      totalMat: versionTotal.mat,
    },
  });

  logger.info({ versionId, totalAmount: versionTotal.total }, 'Пересчёт итогов завершён');
}
