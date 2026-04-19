import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isCurrent: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности версии объекту и организации текущего пользователя
    const version = await db.projectManagementVersion.findFirst({
      where: { id: params.versionId, projectId: params.projectId },
      include: { project: { select: { organizationId: true } } },
    });
    if (!version || version.project.organizationId !== session.user.organizationId) {
      return errorResponse('Версия не найдена', 404);
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Если устанавливается флаг "текущая" — снять его со всех остальных версий проекта
    if (parsed.data.isCurrent === true) {
      await db.$transaction(async (tx) => {
        // Снимаем флаг "текущая" со всех версий проекта
        await tx.projectManagementVersion.updateMany({
          where: { projectId: params.projectId },
          data: { isCurrent: false },
        });
        // Устанавливаем текущей выбранную версию
        await tx.projectManagementVersion.update({
          where: { id: params.versionId },
          data: { name: parsed.data.name ?? version.name, isCurrent: true },
        });
      });

      const updated = await db.projectManagementVersion.findUniqueOrThrow({
        where: { id: params.versionId },
      });
      return successResponse(updated);
    }

    // Обычное обновление (только name)
    const updated = await db.projectManagementVersion.update({
      where: { id: params.versionId },
      data: { name: parsed.data.name },
    });
    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления версии планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности версии объекту и организации текущего пользователя
    const version = await db.projectManagementVersion.findFirst({
      where: { id: params.versionId, projectId: params.projectId },
      include: { project: { select: { organizationId: true } } },
    });
    if (!version || version.project.organizationId !== session.user.organizationId) {
      return errorResponse('Версия не найдена', 404);
    }

    // Запрет удаления текущей версии — нельзя оставить проект без активной версии УП
    if (version.isCurrent) {
      return errorResponse('Нельзя удалить текущую версию УП', 400);
    }

    // При удалении версии связанные задачи получат versionId = NULL (FK ON DELETE SET NULL)
    await db.projectManagementVersion.delete({ where: { id: params.versionId } });

    return successResponse({ id: params.versionId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления версии планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
