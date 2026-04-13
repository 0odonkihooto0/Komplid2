import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { recalcSummaryTasks } from '@/lib/gantt/recalc-summary';

export const dynamic = 'force-dynamic';

const syncDelegationSchema = z
  .object({
    taskIds: z.array(z.string().uuid()).optional(),
  })
  .optional();

/**
 * Синхронизация фактических данных из делегированных версий в исходную.
 * Для каждой делегированной задачи: обновить factStart, factEnd, progress
 * из соответствующей задачи целевой версии (по sourceTaskId).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
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

    // Парсинг тела (может быть пустым — тогда синхронизируем все делегированные задачи)
    let filterTaskIds: string[] | undefined;
    const bodyText = await req.text();
    if (bodyText) {
      const parsed = syncDelegationSchema.safeParse(JSON.parse(bodyText));
      if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);
      filterTaskIds = parsed.data?.taskIds;
    }

    // Загрузить делегированные задачи исходной версии
    const whereClause: Record<string, unknown> = {
      versionId: params.versionId,
      delegatedToVersionId: { not: null },
    };
    if (filterTaskIds && filterTaskIds.length > 0) {
      whereClause.id = { in: filterTaskIds };
    }

    const delegatedTasks = await db.ganttTask.findMany({ where: whereClause });

    if (delegatedTasks.length === 0) {
      return successResponse({ synced: 0, unmatched: [], total: 0 });
    }

    // Сгруппировать по целевой версии
    const byTargetVersion = new Map<string, typeof delegatedTasks>();
    for (const task of delegatedTasks) {
      const key = task.delegatedToVersionId!;
      if (!byTargetVersion.has(key)) byTargetVersion.set(key, []);
      byTargetVersion.get(key)!.push(task);
    }

    let syncedCount = 0;
    const unmatchedIds: string[] = [];

    await db.$transaction(async (tx) => {
      for (const [targetVersionId, sourceTasks] of Array.from(byTargetVersion)) {
        // Загрузить задачи целевой версии с sourceTaskId, соответствующим исходным
        const sourceIds = sourceTasks.map((t) => t.id);
        const targetTasks = await tx.ganttTask.findMany({
          where: {
            versionId: targetVersionId,
            sourceTaskId: { in: sourceIds },
          },
        });

        // Построить карту: sourceTaskId → задача в целевой версии
        const targetBySourceId = new Map(
          targetTasks
            .filter((t) => t.sourceTaskId !== null)
            .map((t) => [t.sourceTaskId!, t])
        );

        for (const sourceTask of sourceTasks) {
          const targetTask = targetBySourceId.get(sourceTask.id);
          if (!targetTask) {
            unmatchedIds.push(sourceTask.id);
            continue;
          }

          await tx.ganttTask.update({
            where: { id: sourceTask.id },
            data: {
              factStart: targetTask.factStart,
              factEnd: targetTask.factEnd,
              progress: targetTask.progress,
            },
          });
          syncedCount++;
        }
      }

      // Пересчитать суммарные задачи исходной версии
      await recalcSummaryTasks(tx, params.versionId);
    });

    return successResponse({
      synced: syncedCount,
      unmatched: unmatchedIds,
      total: delegatedTasks.length,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка синхронизации делегированных задач ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
