import { db } from '@/lib/db';
import { EstimateVersion } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * Конвертирует подтверждённый EstimateImport в версионированную структуру сметы:
 * EstimateVersion → EstimateChapter[] → EstimateItem[]
 *
 * Вызывается ПОСЛЕ создания WorkItems в роуте confirm —
 * не заменяет WorkItem-логику, а дополняет её.
 *
 * Логика иерархии:
 * - Если в импорте есть позиции с parentItemId !== null →
 *     корневые (parentItemId === null) становятся главами (EstimateChapter),
 *     дочерние — позициями (EstimateItem) внутри своей главы.
 * - Если все позиции плоские (parentItemId === null для всех) →
 *     создаётся один дефолтный чаптер «Сметные позиции»,
 *     все позиции помещаются в него.
 */
export async function convertImportToVersion(
  importId: string,
  contractId: string,
  userId: string,
  versionName?: string
): Promise<EstimateVersion> {
  const importData = await db.estimateImport.findUniqueOrThrow({
    where: { id: importId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  const allItems = importData.items;

  // Определяем тип структуры: иерархическая или плоская
  const hasHierarchy = allItems.some((item) => item.parentItemId !== null);

  // Итоговая сумма по всем позициям импорта
  const totalAmount = allItems.reduce((sum, item) => sum + (item.total ?? 0), 0);

  logger.info(
    { importId, contractId, itemCount: allItems.length, hasHierarchy },
    'Конвертация EstimateImport в EstimateVersion'
  );

  return await db.$transaction(async (tx) => {
    // Создаём версию сметы
    const version = await tx.estimateVersion.create({
      data: {
        name:
          versionName ??
          `Версия от ${new Date().toLocaleDateString('ru-RU')}`,
        versionType: 'ACTUAL',
        isBaseline: false,
        isActual: true,
        contractId,
        sourceImportId: importId,
        createdById: userId,
        totalAmount,
      },
    });

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
        // Итоговая сумма главы — сумма дочерних позиций
        const children = childItemsByParent.get(rootItem.id) ?? [];
        const chapterTotal = children.reduce(
          (sum, child) => sum + (child.total ?? 0),
          0
        );

        const chapter = await tx.estimateChapter.create({
          data: {
            code: String(chapterIdx + 1),
            name: rootItem.rawName,
            order: chapterIdx,
            level: 0,
            versionId: version.id,
            totalAmount: chapterTotal || null,
          },
        });

        // Создаём позиции внутри главы
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
      // Плоская структура: один дефолтный чаптер для всех позиций
      const chapter = await tx.estimateChapter.create({
        data: {
          code: '1',
          name: 'Сметные позиции',
          order: 0,
          level: 0,
          versionId: version.id,
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

    return version;
  });
}
