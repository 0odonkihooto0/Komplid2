import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const reorderSchema = z.object({
  taskId: z.string().uuid(),
  newParentTaskId: z.string().uuid().nullable(),
  newOrder: z.number().int().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { objectId: string } },
) {
  try {
    // Проверяем сессию и принадлежность объекта к организации
    const session = await getSessionOrThrow();
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Парсим и валидируем тело запроса
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { taskId, newParentTaskId, newOrder } = parsed.data;

    // Верифицируем что задача принадлежит этому объекту
    const task = await db.task.findFirst({
      where: { id: taskId, projectId: params.objectId },
      select: { id: true, parentTaskId: true, order: true },
    });
    if (!task) return errorResponse('Задача не найдена', 404);

    // Вычисляем новый уровень вложенности
    let newLevel = 0;
    if (newParentTaskId) {
      const newParent = await db.task.findFirst({
        where: { id: newParentTaskId, projectId: params.objectId },
        select: { level: true },
      });
      if (!newParent) return errorResponse('Родительская задача не найдена', 404);
      newLevel = newParent.level + 1;
    }

    // Обновляем в транзакции: сдвигаем порядок соседей + обновляем задачу
    await db.$transaction(async (tx) => {
      // Освобождаем место в новой позиции (сдвигаем вниз задачи с order >= newOrder)
      await tx.task.updateMany({
        where: {
          projectId: params.objectId,
          parentTaskId: newParentTaskId,
          order: { gte: newOrder },
          id: { not: taskId },
        },
        data: { order: { increment: 1 } },
      });

      // Обновляем саму задачу
      await tx.task.update({
        where: { id: taskId },
        data: {
          parentTaskId: newParentTaskId,
          level: newLevel,
          order: newOrder,
        },
      });
    });

    return successResponse({ taskId, newParentTaskId, newOrder, newLevel });
  } catch (error) {
    logger.error({ error }, 'Ошибка при переупорядочивании задачи планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
