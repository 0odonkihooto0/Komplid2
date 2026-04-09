import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/objects/[objectId]/gantt-versions/[versionId]/fill-from/[sourceVersionId]
 * Заполнить целевую версию ГПР задачами из исходной (полная перезапись).
 * Удаляет все существующие задачи целевой версии и копирует задачи из источника.
 * Фактические даты и прогресс не переносятся — версия начинается с нуля.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { objectId: string; versionId: string; sourceVersionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что целевая версия принадлежит данному объекту
    const targetVersion = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!targetVersion) return errorResponse('Целевая версия ГПР не найдена', 404);

    // Проверка что исходная версия также принадлежит данному объекту
    const sourceVersion = await db.ganttVersion.findFirst({
      where: { id: params.sourceVersionId, projectId: params.objectId },
    });
    if (!sourceVersion) return errorResponse('Исходная версия ГПР не найдена', 404);

    const copiedCount = await db.$transaction(async (tx) => {
      // Удаляем все существующие задачи целевой версии
      await tx.ganttTask.deleteMany({
        where: { versionId: params.versionId },
      });

      // Загружаем задачи из исходной версии в порядке сортировки
      const sourceTasks = await tx.ganttTask.findMany({
        where: { versionId: params.sourceVersionId },
        orderBy: { sortOrder: 'asc' },
      });

      // Маппинг старых id задач → новых для восстановления иерархии parentId
      const idMap = new Map<string, string>();

      for (const t of sourceTasks) {
        const newTask = await tx.ganttTask.create({
          data: {
            name: t.name,
            sortOrder: t.sortOrder,
            level: t.level,
            status: 'NOT_STARTED',
            planStart: t.planStart,
            planEnd: t.planEnd,
            // Фактические даты и прогресс не копируются — версия начинается с нуля
            progress: 0,
            isCritical: false,
            isMilestone: t.isMilestone,
            volume: t.volume,
            volumeUnit: t.volumeUnit,
            amount: t.amount,
            directiveStart: t.directiveStart,
            directiveEnd: t.directiveEnd,
            estimateItemId: t.estimateItemId,
            linkedExecutionDocsCount: 0,
            versionId: params.versionId,
            // contractId намеренно не передаём — объектные задачи без контракта
          },
        });
        idMap.set(t.id, newTask.id);
      }

      // Восстанавливаем иерархию задач через маппинг oldId → newId
      for (const t of sourceTasks) {
        if (t.parentId && idMap.has(t.parentId)) {
          await tx.ganttTask.update({
            where: { id: idMap.get(t.id)! },
            data: { parentId: idMap.get(t.parentId) },
          });
        }
      }

      return idMap.size;
    });

    return successResponse({ copiedTasks: copiedCount });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка заполнения версии ГПР из источника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
