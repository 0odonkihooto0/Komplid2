import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * Получить задачи версии, делегированные в другие версии.
 * Включает название целевой версии для отображения в UI.
 */
export async function GET(
  _req: NextRequest,
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

    // Загрузить делегированные задачи
    const delegatedTasks = await db.ganttTask.findMany({
      where: {
        versionId: params.versionId,
        delegatedToVersionId: { not: null },
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        workItem: { select: { id: true, name: true, projectCipher: true } },
      },
    });

    if (delegatedTasks.length === 0) {
      return successResponse([]);
    }

    // Загрузить имена целевых версий
    const targetVersionIds = Array.from(
      new Set(delegatedTasks.map((t) => t.delegatedToVersionId!))
    );
    const targetVersions = await db.ganttVersion.findMany({
      where: { id: { in: targetVersionIds } },
      select: { id: true, name: true },
    });
    const versionNameMap = new Map(targetVersions.map((v) => [v.id, v.name]));

    // Обогатить задачи именем целевой версии
    const result = delegatedTasks.map((task) => ({
      ...task,
      delegatedToVersionName:
        versionNameMap.get(task.delegatedToVersionId!) ?? null,
    }));

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения делегированных задач ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
