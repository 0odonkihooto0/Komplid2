import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { calculateCriticalPath } from '@/lib/gantt/critical-path';

export const dynamic = 'force-dynamic';

// Схема валидации query-параметров: необязательный диапазон дат для S-кривой
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/objects/[objectId]/gantt-versions/[versionId]/analytics?startDate=2025-01-01&endDate=2025-12-31
 * Возвращает аналитику версии ГПР: S-кривая, отклонения по срокам, критический путь, готовность ИД.
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

    const { startDate, endDate } = parsed.data;

    // Загружаем все задачи версии и зависимости параллельно
    const [tasks, dependencies] = await Promise.all([
      db.ganttTask.findMany({
        where: { versionId: params.versionId },
        orderBy: { sortOrder: 'asc' },
      }),
      db.ganttDependency.findMany({
        where: { predecessor: { versionId: params.versionId } },
      }),
    ]);

    // --- 1. S-кривая (только если переданы обе даты) ---
    type SCurvePoint = { date: string; plannedProgress: number; actualProgress: number };
    const sCurve: SCurvePoint[] = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalTasks = tasks.length;

      if (totalTasks > 0 && start <= end) {
        const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
        // Перебираем дни с шагом 7 дней (еженедельный срез)
        for (let day = new Date(start); day <= end; day = new Date(day.getTime() + MS_PER_WEEK)) {
          const snapshot = day;

          // Плановый прогресс: % задач, у которых planEnd <= snapshot
          const plannedDone = tasks.filter(
            (t) => t.planEnd.getTime() <= snapshot.getTime(),
          ).length;

          // Фактический прогресс: % задач с фактической датой окончания <= snapshot
          const actualDone = tasks.filter(
            (t) => t.factEnd !== null && t.factEnd.getTime() <= snapshot.getTime(),
          ).length;

          sCurve.push({
            date: snapshot.toISOString().slice(0, 10),
            plannedProgress: Math.round((plannedDone / totalTasks) * 100 * 10) / 10,
            actualProgress: Math.round((actualDone / totalTasks) * 100 * 10) / 10,
          });
        }
      }
    }

    // --- 2. Отклонения по срокам ---
    // Включаем задачи с задержкой фактического начала или окончания относительно плана
    const deviations = tasks
      .filter(
        (t) =>
          (t.factEnd !== null && t.factEnd > t.planEnd) ||
          (t.factStart !== null && t.factStart > t.planStart),
      )
      .map((t) => ({
        taskId: t.id,
        taskName: t.name,
        plannedDays: Math.ceil(
          (t.planEnd.getTime() - t.planStart.getTime()) / 86400000,
        ),
        actualDays:
          t.factStart !== null && t.factEnd !== null
            ? Math.ceil((t.factEnd.getTime() - t.factStart.getTime()) / 86400000)
            : null,
        deltaStart:
          t.factStart !== null
            ? Math.ceil((t.factStart.getTime() - t.planStart.getTime()) / 86400000)
            : null,
      }));

    // --- 3. Критический путь ---
    // calculateCriticalPath возвращает массив id задач на критическом пути
    const criticalIds = calculateCriticalPath(tasks, dependencies);
    const criticalIdSet = new Set(criticalIds);
    const criticalTasks = tasks.filter((t) => criticalIdSet.has(t.id));

    // --- 4. Готовность исполнительной документации ---
    // MVP: signedDocsCount = 0, будет интегрировано с ExecutionDoc в следующих фазах
    const idReadiness = tasks.map((t) => ({
      taskId: t.id,
      taskName: t.name,
      linkedDocsCount: t.linkedExecutionDocsCount,
      signedDocsCount: 0, // MVP — в будущем из ExecutionDoc
    }));

    return successResponse({
      sCurve,
      deviations,
      criticalPath: { tasks: criticalTasks },
      idReadiness,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения аналитики версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
