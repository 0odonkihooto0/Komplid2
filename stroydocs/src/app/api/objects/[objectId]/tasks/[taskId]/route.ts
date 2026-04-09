import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const taskUpdateSchema = z.object({
  title:       z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  status:      z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  deadline:    z.string().datetime({ offset: true }).nullable().optional(),
  assigneeId:  z.string().uuid().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; taskId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности проекта
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверка существования задачи
    const existing = await db.task.findFirst({
      where: { id: params.taskId, projectId: params.objectId },
      select: { id: true },
    });
    if (!existing) return errorResponse('Задача не найдена', 404);

    const body = await req.json();
    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { deadline, ...rest } = parsed.data;
    const task = await db.task.update({
      where: { id: params.taskId },
      data: {
        ...rest,
        ...(deadline !== undefined && {
          deadline: deadline ? new Date(deadline) : null,
        }),
      },
      include: {
        assignee:  { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(task);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления задачи');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; taskId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const existing = await db.task.findFirst({
      where: { id: params.taskId, projectId: params.objectId },
      select: { id: true },
    });
    if (!existing) return errorResponse('Задача не найдена', 404);

    await db.task.delete({ where: { id: params.taskId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления задачи');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
