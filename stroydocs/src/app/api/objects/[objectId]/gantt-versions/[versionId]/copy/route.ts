import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const copyVersionSchema = z.object({
  name: z.string().min(1).max(200),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что версия-источник принадлежит данному объекту
    const sourceVersion = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!sourceVersion) return errorResponse('Версия-источник не найдена', 404);

    const body: unknown = await req.json();
    const parsed = copyVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { name } = parsed.data;

    // Транзакция: создаём новую версию и копируем все задачи с восстановлением иерархии
    const newVersion = await db.$transaction(async (tx) => {
      // Создаём новую версию ГПР (без привязки к контракту — объектный уровень)
      const created = await tx.ganttVersion.create({
        data: {
          name,
          projectId: params.objectId,
          stageId: sourceVersion.stageId,
          isDirective: false,
          createdById: session.user.id,
          // contractId не передаём — объектные версии ГПР без контракта
        },
      });

      // Загружаем задачи из версии-источника в порядке сортировки
      const sourceTasks = await tx.ganttTask.findMany({
        where: { versionId: params.versionId },
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
            // Фактические даты и прогресс не копируются — новая версия начинается с нуля
            progress: 0,
            isCritical: false,
            isMilestone: t.isMilestone,
            volume: t.volume,
            volumeUnit: t.volumeUnit,
            amount: t.amount,
            directiveStart: t.directiveStart,
            directiveEnd: t.directiveEnd,
            estimateItemId: t.estimateItemId,
            versionId: created.id,
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

      return created;
    });

    return successResponse(newVersion);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка копирования версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
