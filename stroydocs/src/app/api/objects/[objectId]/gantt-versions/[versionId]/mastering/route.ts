import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

// Схема валидации query-параметров
const querySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getFullYear()),
});

/**
 * GET /api/objects/[objectId]/gantt-versions/[versionId]/mastering?year=2025
 * Возвращает помесячный план освоения средств по версии ГПР.
 * factAmount = 0 в MVP (будет заполняться из КС-2 в следующих фазах).
 */
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

    // Проверка что версия принадлежит данному объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    // Парсинг и валидация query-параметров
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { year } = parsed.data;

    // Формируем помесячную аналитику освоения за запрошенный год
    const months: Array<{
      month: string;
      planAmount: number;
      factAmount: number;
      taskCount: number;
    }> = [];

    let totalPlan = 0;
    let totalFact = 0;

    for (let month = 1; month <= 12; month++) {
      // Диапазон месяца (первый и последний день)
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      // Задачи, активные в этом месяце: плановый период пересекается с месяцем
      const tasks = await db.ganttTask.findMany({
        where: {
          versionId: params.versionId,
          planStart: { lte: monthEnd },
          planEnd: { gte: monthStart },
        },
        select: { amount: true },
      });

      // Суммируем плановую стоимость (null → 0)
      const planAmount = tasks.reduce((sum, t) => sum + (t.amount ?? 0), 0);
      // MVP: фактическое освоение будет интегрировано с КС-2 в следующих фазах
      const factAmount = 0;

      const monthLabel = `${year}-${String(month).padStart(2, '0')}`;

      months.push({
        month: monthLabel,
        planAmount,
        factAmount,
        taskCount: tasks.length,
      });

      totalPlan += planAmount;
      totalFact += factAmount;
    }

    return successResponse({ months, totalPlan, totalFact });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения помесячного плана освоения ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
