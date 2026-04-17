import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateTaskTemplateSchema } from '@/lib/validations/task';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const template = await db.taskTemplate.findFirst({
      where: { id, organizationId: orgId },
      include: {
        taskType: { select: { id: true, key: true, name: true } },
        group: { select: { id: true, name: true } },
        author: { select: { id: true, firstName: true, lastName: true } },
        schedules: true,
        children: {
          select: { id: true, name: true, priority: true, duration: true },
        },
        parentTemplate: { select: { id: true, name: true } },
      },
    });

    if (!template) return errorResponse('Шаблон не найден', 404);
    return successResponse(template);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-templates/id] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const template = await db.taskTemplate.findFirst({ where: { id, organizationId: orgId } });
    if (!template) return errorResponse('Шаблон не найден', 404);

    const body: unknown = await req.json();
    const parsed = updateTaskTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { groupId, typeId, parentTemplateId, ...rest } = parsed.data;

    if (groupId) {
      const group = await db.taskGroup.findFirst({ where: { id: groupId, organizationId: orgId } });
      if (!group) return errorResponse('Группа не найдена', 404);
    }

    const updated = await db.taskTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...(groupId !== undefined ? { groupId } : {}),
        ...(typeId !== undefined ? { typeId } : {}),
        ...(parentTemplateId !== undefined ? { parentTemplateId } : {}),
      },
    });

    return successResponse(updated);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-templates/id] PATCH:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const template = await db.taskTemplate.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { schedules: true } } },
    });
    if (!template) return errorResponse('Шаблон не найден', 404);

    await db.taskTemplate.delete({ where: { id } });
    return successResponse({ id });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-templates/id] DELETE:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
