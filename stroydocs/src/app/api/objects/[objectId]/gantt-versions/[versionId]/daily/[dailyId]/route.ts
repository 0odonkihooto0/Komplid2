import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateDailyPlanSchema = z.object({
  planDate: z.string().datetime().optional(),
  workers: z.number().int().min(0).nullable().optional(),
  machinery: z.string().max(500).nullable().optional(),
  volume: z.number().min(0).nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; versionId: string; dailyId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Находим запись суточного плана с проверкой принадлежности к версии через задачу
    const dailyPlan = await db.ganttDailyPlan.findFirst({
      where: { id: params.dailyId },
      include: { task: { select: { versionId: true } } },
    });
    if (!dailyPlan) return errorResponse('Запись суточного плана не найдена', 404);

    // Проверяем что запись относится к нужной версии ГПР
    if (dailyPlan.task.versionId !== params.versionId) {
      return errorResponse('Запись суточного плана не найдена', 404);
    }

    const body: unknown = await req.json();
    const parsed = updateDailyPlanSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { planDate, workers, machinery, volume, unit, notes } = parsed.data;

    // Обновляем только переданные поля
    const updated = await db.ganttDailyPlan.update({
      where: { id: params.dailyId },
      data: {
        ...(planDate !== undefined && { planDate: new Date(planDate) }),
        ...(workers !== undefined && { workers }),
        ...(machinery !== undefined && { machinery }),
        ...(volume !== undefined && { volume }),
        ...(unit !== undefined && { unit }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        task: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления записи суточного плана ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; versionId: string; dailyId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Находим запись суточного плана с проверкой принадлежности к версии через задачу
    const dailyPlan = await db.ganttDailyPlan.findFirst({
      where: { id: params.dailyId },
      include: { task: { select: { versionId: true } } },
    });
    if (!dailyPlan) return errorResponse('Запись суточного плана не найдена', 404);

    // Проверяем что запись относится к нужной версии ГПР
    if (dailyPlan.task.versionId !== params.versionId) {
      return errorResponse('Запись суточного плана не найдена', 404);
    }

    // Удаляем запись суточного плана
    await db.ganttDailyPlan.delete({ where: { id: params.dailyId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления записи суточного плана ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
