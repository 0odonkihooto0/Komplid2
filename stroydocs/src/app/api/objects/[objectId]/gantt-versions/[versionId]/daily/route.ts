import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

const createDailyPlanSchema = z.object({
  taskId: z.string().uuid(),
  planDate: z.string().datetime(),
  workers: z.number().int().min(0).optional(),
  machinery: z.string().max(500).optional(),
  volume: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(
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

    // Проверка принадлежности версии ГПР объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    // Фильтр по дате (опционально)
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const planDateFilter = dateParam
      ? {
          planDate: {
            gte: startOfDay(new Date(dateParam)),
            lte: endOfDay(new Date(dateParam)),
          },
        }
      : {};

    // Получаем записи суточного плана для данной версии ГПР
    const dailyPlans = await db.ganttDailyPlan.findMany({
      where: {
        task: { versionId: params.versionId },
        ...planDateFilter,
      },
      include: {
        task: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { planDate: 'asc' },
    });

    return successResponse(dailyPlans);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения суточного плана ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

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

    // Проверка принадлежности версии ГПР объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const body: unknown = await req.json();
    const parsed = createDailyPlanSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { taskId, planDate, workers, machinery, volume, unit, notes } = parsed.data;

    // Проверяем что задача принадлежит данной версии ГПР
    const task = await db.ganttTask.findFirst({
      where: { id: taskId, versionId: params.versionId },
    });
    if (!task) return errorResponse('Задача не найдена в данной версии', 404);

    // Создаём запись суточного плана
    const dailyPlan = await db.ganttDailyPlan.create({
      data: {
        taskId,
        planDate: new Date(planDate),
        workers: workers ?? null,
        machinery: machinery ?? null,
        volume: volume ?? null,
        unit: unit ?? null,
        notes: notes ?? null,
        createdById: session.user.id,
      },
      include: {
        task: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    return successResponse(dailyPlan);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания записи суточного плана ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
