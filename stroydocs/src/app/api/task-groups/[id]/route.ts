import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateTaskGroupSchema } from '@/lib/validations/task';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const group = await db.taskGroup.findFirst({
      where: { id, organizationId: orgId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        children: { orderBy: [{ order: 'asc' }] },
        labels: true,
        _count: { select: { tasks: true, templates: true } },
      },
    });

    if (!group) return errorResponse('Группа не найдена', 404);
    return successResponse(group);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-groups/id] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;
    const { id } = await params;

    const group = await db.taskGroup.findFirst({ where: { id, organizationId: orgId } });
    if (!group) return errorResponse('Группа не найдена', 404);

    const isAdmin = session.user.role === 'ADMIN';
    if (!isAdmin && group.authorId !== userId) {
      return errorResponse('Нет прав для редактирования группы', 403);
    }

    const body: unknown = await req.json();
    const parsed = updateTaskGroupSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { visibleUserIds, parentId, ...rest } = parsed.data;

    if (parentId !== undefined && parentId !== null) {
      const parent = await db.taskGroup.findFirst({
        where: { id: parentId, organizationId: orgId },
      });
      if (!parent) return errorResponse('Родительская группа не найдена', 404);
    }

    if (visibleUserIds && visibleUserIds.length > 0) {
      const count = await db.user.count({
        where: { id: { in: visibleUserIds }, organizationId: orgId },
      });
      if (count !== visibleUserIds.length) {
        return errorResponse('Один или несколько пользователей не найдены в организации', 400);
      }
    }

    const updated = await db.taskGroup.update({
      where: { id },
      data: {
        ...rest,
        ...(parentId !== undefined ? { parentId } : {}),
        ...(visibleUserIds !== undefined ? { visibleUserIds } : {}),
      },
    });

    return successResponse(updated);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-groups/id] PATCH:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;
    const { id } = await params;

    const group = await db.taskGroup.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { tasks: true } } },
    });
    if (!group) return errorResponse('Группа не найдена', 404);

    const isAdmin = session.user.role === 'ADMIN';
    if (!isAdmin && group.authorId !== userId) {
      return errorResponse('Нет прав для удаления группы', 403);
    }

    if (group._count.tasks > 0) {
      return errorResponse('Нельзя удалить группу с задачами', 409);
    }

    await db.taskGroup.delete({ where: { id } });
    return successResponse({ id });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-groups/id] DELETE:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
