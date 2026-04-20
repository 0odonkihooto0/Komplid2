import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateTaskLabelSchema } from '@/lib/validations/task';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const label = await db.taskLabel.findFirst({ where: { id, organizationId: orgId } });
    if (!label) return errorResponse('Метка не найдена', 404);

    const body: unknown = await req.json();
    const parsed = updateTaskLabelSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { groupId, ...rest } = parsed.data;

    if (groupId) {
      const group = await db.taskGroup.findFirst({ where: { id: groupId, organizationId: orgId } });
      if (!group) return errorResponse('Группа не найдена', 404);
    }

    const updated = await db.taskLabel.update({
      where: { id },
      data: { ...rest, ...(groupId !== undefined ? { groupId } : {}) },
    });

    return successResponse(updated);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-labels/id] PATCH:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    const label = await db.taskLabel.findFirst({ where: { id, organizationId: orgId } });
    if (!label) return errorResponse('Метка не найдена', 404);

    await db.taskLabel.delete({ where: { id } });
    return successResponse({ id });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-labels/id] DELETE:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
