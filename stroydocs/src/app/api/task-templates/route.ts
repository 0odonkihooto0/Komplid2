import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createTaskTemplateSchema } from '@/lib/validations/task';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { searchParams } = new URL(req.url);

    const groupId = searchParams.get('groupId');
    const typeId = searchParams.get('typeId');
    const parentTemplateId = searchParams.get('parentTemplateId');

    const templates = await db.taskTemplate.findMany({
      where: {
        organizationId: orgId,
        ...(groupId ? { groupId } : {}),
        ...(typeId ? { typeId } : {}),
        ...(parentTemplateId !== null
          ? { parentTemplateId: parentTemplateId === 'null' ? null : parentTemplateId }
          : {}),
      },
      include: {
        taskType: { select: { id: true, key: true, name: true } },
        group: { select: { id: true, name: true } },
        author: { select: { id: true, firstName: true, lastName: true } },
        schedules: true,
        _count: { select: { children: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(templates);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-templates] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const body: unknown = await req.json();
    const parsed = createTaskTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { groupId, typeId, parentTemplateId, ...rest } = parsed.data;

    if (groupId) {
      const group = await db.taskGroup.findFirst({ where: { id: groupId, organizationId: orgId } });
      if (!group) return errorResponse('Группа не найдена', 404);
    }
    if (typeId) {
      const type = await db.taskType.findFirst({
        where: { id: typeId, OR: [{ isSystem: true }, { organizationId: orgId }] },
      });
      if (!type) return errorResponse('Тип задачи не найден', 404);
    }
    if (parentTemplateId) {
      const parent = await db.taskTemplate.findFirst({
        where: { id: parentTemplateId, organizationId: orgId },
      });
      if (!parent) return errorResponse('Родительский шаблон не найден', 404);
    }

    const template = await db.taskTemplate.create({
      data: {
        ...rest,
        groupId: groupId ?? null,
        typeId: typeId ?? null,
        parentTemplateId: parentTemplateId ?? null,
        organizationId: orgId,
        authorId: userId,
      },
    });

    return successResponse(template);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-templates] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
