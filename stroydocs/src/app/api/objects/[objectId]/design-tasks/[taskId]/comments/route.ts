import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getNextTaskCommentNumber } from '@/lib/numbering';
import type { DesignCommentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createCommentSchema = z.object({
  description: z.string().min(1),
  deadline: z.string().datetime().optional(),
  paramKey: z.string().optional(),
  assigneeId: z.string().optional(),
  s3Keys: z.array(z.string()).default([]),
});

type Params = { params: { objectId: string; taskId: string } };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!task) return errorResponse('Задание не найдено', 404);

    const sp = req.nextUrl.searchParams;
    const status = sp.get('status') as DesignCommentStatus | null;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
    const skip = (page - 1) * limit;

    const where = {
      taskId: params.taskId,
      ...(status && { status }),
    };

    const [comments, total] = await Promise.all([
      db.designTaskComment.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { number: 'asc' },
        take: limit,
        skip,
      }),
      db.designTaskComment.count({ where }),
    ]);

    return successResponse({ data: comments, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения замечаний к заданию ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!task) return errorResponse('Задание не найдено', 404);

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { description, deadline, paramKey, assigneeId, s3Keys } = parsed.data;

    // Авто-инкремент номера замечания в рамках задания
    const number = await getNextTaskCommentNumber(params.taskId);

    const comment = await db.designTaskComment.create({
      data: {
        number,
        description,
        deadline: deadline ? new Date(deadline) : null,
        paramKey: paramKey ?? null,
        assigneeId: assigneeId ?? null,
        s3Keys: s3Keys ?? [],
        taskId: params.taskId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Уведомить назначенного исполнителя
    if (assigneeId) {
      await db.notification.create({
        data: {
          userId: assigneeId,
          type: 'comment_assigned',
          title: 'Новое замечание к заданию ПИР',
          body: `Замечание №${number}: ${description.slice(0, 100)}`,
          entityType: 'DesignTask',
          entityId: params.taskId,
        },
      }).catch((err: unknown) => logger.error({ err }, 'Ошибка уведомления о замечании ПИР'));
    }

    return successResponse(comment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания замечания к заданию ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
