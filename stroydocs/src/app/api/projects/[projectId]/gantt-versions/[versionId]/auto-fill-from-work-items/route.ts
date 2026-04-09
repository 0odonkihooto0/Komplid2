import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * POST — автосоздание задач ГПР из WorkItems всех договоров объекта.
 * WorkItems уже привязанные к задачам этой версии пропускаются.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.projectId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    // Найти все договоры объекта (принадлежность проекта организации уже проверена выше)
    const contracts = await db.contract.findMany({
      where: { projectId: params.projectId },
      select: { id: true },
    });
    const contractIds = contracts.map((c) => c.id);

    if (contractIds.length === 0) {
      return successResponse({ created: 0, message: 'Нет договоров у объекта' });
    }

    // WorkItemIds уже привязанные к задачам этой версии
    const existingWorkItemIds = await db.ganttTask
      .findMany({
        where: { versionId: params.versionId, workItemId: { not: null } },
        select: { workItemId: true },
      })
      .then((tasks) => tasks.map((t) => t.workItemId!));

    const workItems = await db.workItem.findMany({
      where: {
        contractId: { in: contractIds },
        id: { notIn: existingWorkItemIds },
      },
      orderBy: [{ contractId: 'asc' }, { createdAt: 'asc' }],
    });

    if (workItems.length === 0) {
      return successResponse({ created: 0, message: 'Все виды работ уже привязаны' });
    }

    // Получаем текущий maxSortOrder
    const lastTask = await db.ganttTask.findFirst({
      where: { versionId: params.versionId },
      orderBy: { sortOrder: 'desc' },
    });
    const baseSortOrder = (lastTask?.sortOrder ?? -1) + 1;

    // Даты: от сегодня, равномерно по 30 дней на весь набор
    const planStart = new Date();
    const planEnd = new Date(planStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    const totalMs = planEnd.getTime() - planStart.getTime();
    const stepMs = totalMs / workItems.length;

    const tasks = workItems.map((wi, i) => ({
      name: wi.name,
      planStart: new Date(planStart.getTime() + i * stepMs),
      planEnd: new Date(planStart.getTime() + (i + 1) * stepMs - 1),
      workItemId: wi.id,
      sortOrder: baseSortOrder + i,
      versionId: params.versionId,
      level: 0,
      progress: 0,
      isCritical: false,
    }));

    await db.ganttTask.createMany({ data: tasks });

    return successResponse({ created: tasks.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка автозаполнения ГПР из видов работ');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
