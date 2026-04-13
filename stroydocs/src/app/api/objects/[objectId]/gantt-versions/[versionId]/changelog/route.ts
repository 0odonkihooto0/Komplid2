import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

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

    // Проверка принадлежности версии к объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    // Пагинация
    const takeRaw = parseInt(req.nextUrl.searchParams.get('take') ?? '50');
    const skipRaw = parseInt(req.nextUrl.searchParams.get('skip') ?? '0');
    const take = Math.min(200, Math.max(1, isNaN(takeRaw) ? 50 : takeRaw));
    const skip = Math.max(0, isNaN(skipRaw) ? 0 : skipRaw);

    // Фильтры
    const search = req.nextUrl.searchParams.get('search') ?? undefined;
    const dateFrom = req.nextUrl.searchParams.get('from') ?? undefined;
    const dateTo = req.nextUrl.searchParams.get('to') ?? undefined;

    // Построение условий фильтрации
    const where: Record<string, unknown> = { versionId: params.versionId };

    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    // Фильтр по задаче: сначала ищем taskId по имени задачи (нет @relation в модели)
    if (search) {
      const matchingTasks = await db.ganttTask.findMany({
        where: {
          versionId: params.versionId,
          name: { contains: search, mode: 'insensitive' },
        },
        select: { id: true },
        take: 100,
      });
      const matchingIds = matchingTasks.map((t) => t.id);
      where.OR = [
        ...(matchingIds.length > 0 ? [{ taskId: { in: matchingIds } }] : []),
        { fieldName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      db.ganttChangeLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      db.ganttChangeLog.count({ where }),
    ]);

    // Подгружаем имена задач для записей с taskId
    const taskIds = Array.from(new Set(logs.map((l) => l.taskId).filter(Boolean))) as string[];
    const taskMap = new Map<string, string>();
    if (taskIds.length > 0) {
      const tasks = await db.ganttTask.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, name: true },
      });
      for (const t of tasks) taskMap.set(t.id, t.name);
    }

    const enriched = logs.map((l) => ({
      ...l,
      taskName: l.taskId ? (taskMap.get(l.taskId) ?? null) : null,
    }));

    return successResponse(enriched, {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения журнала изменений ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
