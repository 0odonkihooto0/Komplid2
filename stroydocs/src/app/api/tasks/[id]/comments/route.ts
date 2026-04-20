import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { canUserSeeTask } from '@/lib/task-visibility';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

const createCommentSchema = z.object({
  text: z.string().min(1, 'Текст обязателен').max(5000),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id } = await params;

    const task = await db.task.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: {
        roles: true,
        group: { select: { id: true, visibility: true, visibleUserIds: true } },
      },
    });
    if (!task || !canUserSeeTask(userId, task)) {
      return errorResponse('Задача не найдена', 404);
    }

    const comments = await db.taskComment.findMany({
      where: { taskId: id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(comments);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/comments] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id } = await params;

    const task = await db.task.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: {
        roles: true,
        group: { select: { id: true, visibility: true, visibleUserIds: true } },
      },
    });
    if (!task || !canUserSeeTask(userId, task)) {
      return errorResponse('Задача не найдена', 404);
    }

    const body: unknown = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const comment = await db.$transaction(async (tx) => {
      const newComment = await tx.taskComment.create({
        data: { taskId: id, authorId: userId, text: parsed.data.text },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Пометить задачу как непрочитанную для автора если комментирует не автор
      const isAuthor = task.roles.some((r) => r.userId === userId && r.role === 'AUTHOR') || task.createdById === userId;
      if (!isAuthor) {
        await tx.task.update({ where: { id }, data: { isReadByAuthor: false } });
      }

      return newComment;
    });

    return successResponse(comment);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/comments] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
