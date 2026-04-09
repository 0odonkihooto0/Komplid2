import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * POST — автосоздание задач Ганта из WorkItems договора.
 * Задачи с уже привязанным workItemId пропускаются.
 * Даты распределяются равномерно от startDate до endDate договора.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const contract = await db.contract.findFirst({
      where: { id: params.contractId, projectId: params.objectId },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    // WorkItems без уже привязанных задач в этой версии
    const existingWorkItemIds = await db.ganttTask
      .findMany({
        where: { versionId: params.versionId, workItemId: { not: null } },
        select: { workItemId: true },
      })
      .then((tasks) => tasks.map((t) => t.workItemId!));

    const workItems = await db.workItem.findMany({
      where: {
        contractId: params.contractId,
        id: { notIn: existingWorkItemIds },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (workItems.length === 0) {
      return successResponse({ created: 0, message: 'Все виды работ уже привязаны' });
    }

    // Определяем диапазон дат
    const projectStart = contract.startDate ?? new Date();
    const projectEnd = contract.endDate ?? new Date(projectStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    const totalMs = projectEnd.getTime() - projectStart.getTime();
    const stepMs = totalMs / workItems.length;

    // Получаем текущий maxSortOrder
    const lastTask = await db.ganttTask.findFirst({
      where: { versionId: params.versionId },
      orderBy: { sortOrder: 'desc' },
    });
    const sortOrder = (lastTask?.sortOrder ?? -1) + 1;

    const tasks = workItems.map((wi, i) => {
      const planStart = new Date(projectStart.getTime() + i * stepMs);
      const planEnd = new Date(projectStart.getTime() + (i + 1) * stepMs - 1);
      return {
        name: wi.name,
        planStart,
        planEnd,
        workItemId: wi.id,
        sortOrder: sortOrder + i,
        versionId: params.versionId,
        contractId: params.contractId,
        level: 0,
        progress: 0,
        isCritical: false,
      };
    });

    await db.ganttTask.createMany({ data: tasks });

    return successResponse({ created: tasks.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка автозаполнения графика из WorkItems');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
