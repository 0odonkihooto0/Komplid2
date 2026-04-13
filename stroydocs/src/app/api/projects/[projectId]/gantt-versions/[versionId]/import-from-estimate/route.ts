import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { importFromEstimate } from '@/lib/gantt/import-from-estimate';

export const dynamic = 'force-dynamic';

const importSchema = z.object({
  estimateVersionId: z.string().uuid(),
  replace: z.boolean().optional().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем версию ГПР
    const version = await db.ganttVersion.findFirst({
      where: {
        id: params.versionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    // Проверяем что EstimateVersion принадлежит объекту этой организации
    const estimateVersion = await db.estimateVersion.findFirst({
      where: {
        id: parsed.data.estimateVersionId,
        contract: {
          buildingObject: {
            id: params.projectId,
            organizationId: session.user.organizationId,
          },
        },
      },
    });
    if (!estimateVersion) {
      return errorResponse('Версия сметы не найдена', 404);
    }

    // Проверяем что в версии ГПР ещё нет задач (если не режим замены)
    const existingTasks = await db.ganttTask.count({ where: { versionId: params.versionId } });
    if (existingTasks > 0 && !parsed.data.replace) {
      return errorResponse(
        'Версия ГПР уже содержит задачи. Используйте пустую версию для импорта.',
        409
      );
    }

    // Выполняем импорт в транзакции (в режиме замены сначала удаляем сметные задачи)
    await db.$transaction(async (tx) => {
      if (parsed.data.replace && existingTasks > 0) {
        // Удаляем дочерние задачи, привязанные к сметным позициям
        await tx.ganttTask.deleteMany({
          where: { versionId: params.versionId, estimateItemId: { not: null } },
        });
        // Удаляем родительские разделы, оставшиеся без дочерних задач
        const emptyParents = await tx.ganttTask.findMany({
          where: {
            versionId: params.versionId,
            level: 0,
            children: { none: {} },
          },
          select: { id: true },
        });
        if (emptyParents.length > 0) {
          await tx.ganttTask.deleteMany({
            where: { id: { in: emptyParents.map((p) => p.id) } },
          });
        }
      }
      await importFromEstimate(tx, params.versionId, parsed.data.estimateVersionId);
    });

    const taskCount = await db.ganttTask.count({ where: { versionId: params.versionId } });

    return successResponse({ imported: true, taskCount });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка импорта из сметы в ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
