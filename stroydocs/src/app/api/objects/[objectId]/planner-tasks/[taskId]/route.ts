import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  title:        z.string().min(1).max(300).optional(),
  description:  z.string().max(2000).optional(),
  status:       z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority:     z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  deadline:     z.string().datetime({ offset: true }).nullable().optional(),
  assigneeId:   z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  versionId:    z.string().uuid().nullable().optional(),
  order:        z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { objectId: string; taskId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности задачи к объекту текущей организации
    const task = await db.task.findFirst({
      where: { id: params.taskId, projectId: params.objectId },
      include: { project: { select: { organizationId: true } } },
    });
    if (!task || task.project.organizationId !== session.user.organizationId) {
      return errorResponse('Задача не найдена', 404);
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const data = parsed.data;

    // Если меняется родительская задача — пересчитываем уровень вложенности
    let newLevel: number | undefined;
    if ('parentTaskId' in data) {
      if (data.parentTaskId === null) {
        newLevel = 0;
      } else if (data.parentTaskId !== undefined) {
        const parent = await db.task.findFirst({
          where: { id: data.parentTaskId, projectId: params.objectId },
          select: { level: true },
        });
        if (!parent) return errorResponse('Родительская задача не найдена', 404);
        newLevel = parent.level + 1;
      }
    }

    const { deadline, ...rest } = data;

    const updated = await db.task.update({
      where: { id: params.taskId },
      data: {
        ...rest,
        ...(newLevel !== undefined && { level: newLevel }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления задачи планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; taskId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности задачи к объекту текущей организации
    const task = await db.task.findFirst({
      where: { id: params.taskId, projectId: params.objectId },
      include: { project: { select: { organizationId: true } } },
    });
    if (!task || task.project.organizationId !== session.user.organizationId) {
      return errorResponse('Задача не найдена', 404);
    }

    // Дочерние задачи получат parentTaskId = NULL (onDelete: SET NULL на FK)
    await db.task.delete({ where: { id: params.taskId } });

    return successResponse({ id: params.taskId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления задачи планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
