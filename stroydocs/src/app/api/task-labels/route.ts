import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createTaskLabelSchema } from '@/lib/validations/task';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    const labels = await db.taskLabel.findMany({
      where: {
        organizationId: orgId,
        ...(groupId ? { groupId } : {}),
      },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(labels);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-labels] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const body: unknown = await req.json();
    const parsed = createTaskLabelSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { name, color, groupId } = parsed.data;

    if (groupId) {
      const group = await db.taskGroup.findFirst({ where: { id: groupId, organizationId: orgId } });
      if (!group) return errorResponse('Группа не найдена', 404);
    }

    const label = await db.taskLabel.create({
      data: { name, color, groupId: groupId ?? null, organizationId: orgId },
    });

    return successResponse(label);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-labels] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
