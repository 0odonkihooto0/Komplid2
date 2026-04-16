import { addDays } from 'date-fns';
import type { Prisma } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

/**
 * Импортирует структуру сметы в версию ГПР.
 * Каждая глава становится родительской задачей (уровень 0),
 * позиции типа WORK становятся дочерними задачами (уровень 1).
 * Материалы (MATERIAL) пропускаются — они не являются работами ГПР.
 */
export async function importFromEstimate(
  tx: PrismaTx,
  versionId: string,
  estimateVersionId: string,
): Promise<void> {
  const estimateVersion = await tx.estimateVersion.findUniqueOrThrow({
    where: { id: estimateVersionId },
    include: {
      chapters: {
        include: {
          items: {
            where: { isDeleted: false },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  const today = new Date();
  let sortOrder = 0;

  for (const chapter of estimateVersion.chapters) {
    // Глава сметы → родительская задача ГПР (уровень 0, без привязки к EstimateItem)
    const parentTask = await tx.ganttTask.create({
      data: {
        name: chapter.name,
        versionId,
        sortOrder: sortOrder++,
        level: 0,
        planStart: today,
        planEnd: addDays(today, 30), // Заглушка — редактируется вручную
        amount: chapter.totalAmount ?? null,
        status: 'NOT_STARTED',
        progress: 0,
        isCritical: false,
        isMilestone: false,
        linkedExecutionDocsCount: 0,
      },
    });

    // Позиции главы → дочерние задачи (только работы, материалы пропускаем)
    for (const item of chapter.items) {
      if (item.itemType !== 'WORK') continue;

      await tx.ganttTask.create({
        data: {
          name: item.name,
          versionId,
          parentId: parentTask.id,
          sortOrder: sortOrder++,
          level: 1,
          planStart: today,
          planEnd: addDays(today, 14), // Заглушка — редактируется вручную
          volume: item.volume ?? null,
          volumeUnit: item.unit ?? null,
          amount: item.totalPrice ?? null,
          estimateItemId: item.id,
          status: 'NOT_STARTED',
          progress: 0,
          isCritical: false,
          isMilestone: false,
          linkedExecutionDocsCount: 0,
        },
      });
    }
  }
}
