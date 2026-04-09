import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/objects/[objectId]/gantt-versions/[versionId]/set-directive
 * Пометить версию ГПР как директивную.
 * Директивная версия фиксирует плановые даты как базовые (неизменяемые эталон).
 * Для каждой задачи без директивных дат — сохраняет текущие planStart/planEnd
 * в поля directiveStart/directiveEnd.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { objectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что версия принадлежит данному объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    await db.$transaction(async (tx) => {
      // Загружаем задачи без директивных дат — чтобы зафиксировать их плановые даты
      const tasks = await tx.ganttTask.findMany({
        where: { versionId: params.versionId, directiveStart: null },
        select: { id: true, planStart: true, planEnd: true },
      });

      // Устанавливаем директивные даты для каждой задачи поочерёдно
      for (const task of tasks) {
        await tx.ganttTask.update({
          where: { id: task.id },
          data: {
            directiveStart: task.planStart,
            directiveEnd: task.planEnd,
          },
        });
      }

      // Помечаем версию как директивную
      await tx.ganttVersion.update({
        where: { id: params.versionId },
        data: { isDirective: true },
      });
    });

    return successResponse({ message: 'Версия отмечена как директивная' });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка установки директивной версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
