import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createTaskGroupSchema } from '@/lib/validations/task';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { searchParams } = new URL(req.url);

    const parentIdParam = searchParams.get('parentId');
    const parentId = parentIdParam === 'null' ? null : parentIdParam ?? undefined;

    const groups = await db.taskGroup.findMany({
      where: {
        organizationId: orgId,
        ...(parentIdParam !== null ? { parentId } : {}),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { tasks: true, templates: true, children: true } },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return successResponse(groups);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-groups] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const body: unknown = await req.json();
    const parsed = createTaskGroupSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { name, parentId, visibility, visibleUserIds, order } = parsed.data;

    if (parentId) {
      const parent = await db.taskGroup.findFirst({
        where: { id: parentId, organizationId: orgId },
      });
      if (!parent) return errorResponse('Родительская группа не найдена', 404);
    }

    // Проверяем что все visibleUserIds принадлежат организации
    if (visibleUserIds.length > 0) {
      const count = await db.user.count({
        where: { id: { in: visibleUserIds }, organizationId: orgId },
      });
      if (count !== visibleUserIds.length) {
        return errorResponse('Один или несколько пользователей не найдены в организации', 400);
      }
    }

    const autoOrder = order ?? (await db.taskGroup.count({ where: { organizationId: orgId, parentId: parentId ?? null } }));

    const group = await db.taskGroup.create({
      data: {
        name,
        parentId: parentId ?? null,
        visibility,
        visibleUserIds,
        order: autoOrder,
        organizationId: orgId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { tasks: true, templates: true, children: true } },
      },
    });

    return successResponse(group);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-groups] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
