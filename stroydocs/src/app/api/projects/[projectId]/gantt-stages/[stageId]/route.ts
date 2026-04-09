import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateStageSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
  isCurrent: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; stageId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности стадии к объекту организации
    const stage = await db.ganttStage.findFirst({
      where: {
        id: params.stageId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!stage) return errorResponse('Стадия не найдена', 404);

    const body = await req.json();
    const parsed = updateStageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const updated = await db.$transaction(async (tx) => {
      // Если устанавливается как текущая — сбрасываем у остальных стадий проекта
      if (parsed.data.isCurrent === true) {
        await tx.ganttStage.updateMany({
          where: { projectId: params.projectId, id: { not: params.stageId } },
          data: { isCurrent: false },
        });
      }

      return tx.ganttStage.update({
        where: { id: params.stageId },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.order !== undefined && { order: parsed.data.order }),
          ...(parsed.data.isCurrent !== undefined && { isCurrent: parsed.data.isCurrent }),
        },
        include: {
          _count: { select: { versions: true } },
        },
      });
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления стадии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; stageId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const stage = await db.ganttStage.findFirst({
      where: {
        id: params.stageId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
      include: { _count: { select: { versions: true } } },
    });
    if (!stage) return errorResponse('Стадия не найдена', 404);

    // Запрещаем удаление стадии с привязанными версиями
    if (stage._count.versions > 0) {
      return errorResponse(
        'Нельзя удалить стадию с привязанными версиями ГПР. Сначала удалите или перепривяжите версии.',
        409
      );
    }

    await db.ganttStage.delete({ where: { id: params.stageId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления стадии ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
