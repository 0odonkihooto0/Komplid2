import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title:        z.string().min(1).max(300),
  description:  z.string().max(2000).optional(),
  priority:     z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  deadline:     z.string().datetime({ offset: true }).optional(),
  assigneeId:   z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  versionId:    z.string().uuid().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации текущего пользователя
    const object = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Опциональная фильтрация по версии планировщика
    const versionId = req.nextUrl.searchParams.get('versionId') ?? undefined;

    const tasks = await db.task.findMany({
      where: {
        projectId: params.projectId,
        versionId: versionId ?? null,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { childTasks: true } },
      },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });

    return successResponse(tasks);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения задач планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации текущего пользователя
    const object = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const data = parsed.data;

    // Определяем уровень вложенности задачи на основе родителя
    let level = 0;
    if (data.parentTaskId) {
      const parent = await db.task.findFirst({
        where: { id: data.parentTaskId, projectId: params.projectId },
        select: { level: true },
      });
      if (!parent) return errorResponse('Родительская задача не найдена', 404);
      level = parent.level + 1;
    }

    // Вычисляем порядковый номер среди задач того же уровня
    const lastSibling = await db.task.findFirst({
      where: { projectId: params.projectId, parentTaskId: data.parentTaskId ?? null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = (lastSibling?.order ?? -1) + 1;

    const task = await db.task.create({
      data: {
        title:        data.title,
        description:  data.description,
        priority:     data.priority ?? 'MEDIUM',
        deadline:     data.deadline ? new Date(data.deadline) : undefined,
        assigneeId:   data.assigneeId,
        parentTaskId: data.parentTaskId,
        versionId:    data.versionId,
        projectId:    params.projectId,
        createdById:  session.user.id,
        level,
        order,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(task);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания задачи планировщика');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
