import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const fillSchema = z.object({
  sourceVersionId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность целевой версии
    const targetVersion = await db.ganttVersion.findFirst({
      where: {
        id: params.versionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!targetVersion) return errorResponse('Версия ГПР не найдена', 404);

    const body = await req.json();
    const parsed = fillSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { sourceVersionId } = parsed.data;

    // Нельзя копировать из самой себя
    if (sourceVersionId === params.versionId) {
      return errorResponse('Нельзя заполнить версию из самой себя', 400);
    }

    // Проверяем принадлежность исходной версии тому же проекту
    const sourceVersion = await db.ganttVersion.findFirst({
      where: {
        id: sourceVersionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!sourceVersion) return errorResponse('Исходная версия ГПР не найдена', 404);

    // Получаем все задачи из исходной версии (упорядоченные по sortOrder)
    const sourceTasks = await db.ganttTask.findMany({
      where: { versionId: sourceVersionId },
      orderBy: { sortOrder: 'asc' },
    });

    // Удаляем все задачи целевой версии
    await db.ganttTask.deleteMany({ where: { versionId: params.versionId } });

    if (sourceTasks.length === 0) {
      return successResponse({ copied: 0 });
    }

    // Первый проход: создаём задачи с parentId = null, строим маппинг oldId → newId
    const idMap = new Map<string, string>();

    const createdTasks = await Promise.all(
      sourceTasks.map((task) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, versionId: _v, parentId: _p, delegatedToVersionId: _d, sourceTaskId: _s, createdAt: _ca, updatedAt: _ua, ...rest } = task;
        return db.ganttTask.create({
          data: {
            ...rest,
            versionId: params.versionId,
            parentId: null,
            delegatedToVersionId: null,
            sourceTaskId: id,
          },
          select: { id: true },
        });
      })
    );

    // Строим маппинг: старый ID → новый ID
    sourceTasks.forEach((task, idx) => {
      idMap.set(task.id, createdTasks[idx].id);
    });

    // Второй проход: восстанавливаем иерархию (parentId)
    const parentUpdates = sourceTasks
      .filter((t) => t.parentId !== null)
      .map((t) => {
        const newId = idMap.get(t.id);
        const newParentId = t.parentId ? idMap.get(t.parentId) : null;
        if (!newId || !newParentId) return null;
        return db.ganttTask.update({
          where: { id: newId },
          data: { parentId: newParentId },
        });
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    await Promise.all(parentUpdates);

    return successResponse({ copied: sourceTasks.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка заполнения версии ГПР из другой версии');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
