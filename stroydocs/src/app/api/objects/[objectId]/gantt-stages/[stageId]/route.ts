import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateStageSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  order: z.number().int().optional(),
  isCurrent: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; stageId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что стадия принадлежит данному объекту
    const stage = await db.ganttStage.findFirst({
      where: { id: params.stageId, projectId: params.objectId },
    });
    if (!stage) return errorResponse('Стадия не найдена', 404);

    const body: unknown = await req.json();
    const parsed = updateStageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { name, order, isCurrent } = parsed.data;

    let updated;

    if (isCurrent === true) {
      // При установке текущей стадии — сначала сбрасываем флаг у всех остальных,
      // затем обновляем целевую. Выполняем в транзакции для атомарности.
      updated = await db.$transaction(async (tx) => {
        await tx.ganttStage.updateMany({
          where: { projectId: params.objectId },
          data: { isCurrent: false },
        });

        return tx.ganttStage.update({
          where: { id: params.stageId },
          data: {
            ...(name !== undefined && { name }),
            ...(order !== undefined && { order }),
            isCurrent: true,
          },
        });
      });
    } else {
      // Обычное обновление без смены текущей стадии
      updated = await db.ganttStage.update({
        where: { id: params.stageId },
        data: {
          ...(name !== undefined && { name }),
          ...(order !== undefined && { order }),
          ...(isCurrent !== undefined && { isCurrent }),
        },
      });
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления стадии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; stageId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что стадия принадлежит данному объекту
    const stage = await db.ganttStage.findFirst({
      where: { id: params.stageId, projectId: params.objectId },
    });
    if (!stage) return errorResponse('Стадия не найдена', 404);

    // Запрещаем удаление стадии с привязанными версиями ГПР — данные будут потеряны
    const versionsCount = await db.ganttVersion.count({
      where: { stageId: params.stageId },
    });
    if (versionsCount > 0) {
      return errorResponse('Невозможно удалить стадию: есть привязанные версии', 400);
    }

    await db.ganttStage.delete({ where: { id: params.stageId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления стадии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
