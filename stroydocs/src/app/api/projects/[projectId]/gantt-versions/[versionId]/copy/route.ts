import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const source = await db.ganttVersion.findFirst({
      where: {
        id: params.versionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
      include: {
        tasks: true,
      },
    });
    if (!source) return errorResponse('Версия ГПР не найдена', 404);

    const copy = await db.$transaction(async (tx) => {
      // Создаём новую версию-копию
      const newVersion = await tx.ganttVersion.create({
        data: {
          name: `${source.name} (копия)`,
          description: source.description,
          stageId: source.stageId,
          projectId: params.projectId,
          isDirective: false,
          isActive: false,
          isBaseline: false,
          createdById: session.user.id,
        },
      });

      // Создаём задачи в порядке sortOrder (родители раньше детей)
      const sorted = [...source.tasks].sort((a, b) => a.sortOrder - b.sortOrder);

      // Предварительно генерируем UUID для перепривязки parentId без последовательных запросов
      const idMap = new Map<string, string>();
      for (const task of sorted) {
        idMap.set(task.id, crypto.randomUUID());
      }

      const tasksData = sorted.map((task) => ({
        id: idMap.get(task.id)!,
        name: task.name,
        versionId: newVersion.id,
        parentId: task.parentId ? (idMap.get(task.parentId) ?? null) : null,
        sortOrder: task.sortOrder,
        level: task.level,
        status: task.status,
        planStart: task.planStart,
        planEnd: task.planEnd,
        factStart: task.factStart,
        factEnd: task.factEnd,
        progress: task.progress,
        isCritical: task.isCritical,
        isMilestone: task.isMilestone,
        directiveStart: task.directiveStart,
        directiveEnd: task.directiveEnd,
        volume: task.volume,
        volumeUnit: task.volumeUnit,
        amount: task.amount,
        estimateItemId: task.estimateItemId,
        workItemId: task.workItemId,
        linkedExecutionDocsCount: 0,
      }));

      await tx.ganttTask.createMany({ data: tasksData });

      return newVersion;
    });

    return successResponse(copy);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка копирования версии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
