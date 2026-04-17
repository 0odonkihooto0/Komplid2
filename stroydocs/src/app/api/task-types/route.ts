import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createTaskTypeSchema } from '@/lib/validations/task';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const types = await db.taskType.findMany({
      where: {
        OR: [{ isSystem: true }, { organizationId: orgId }],
      },
      include: { _count: { select: { tasks: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return successResponse(types);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-types] GET:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    if (session.user.role !== 'ADMIN') {
      return errorResponse('Создание типов задач доступно только администраторам', 403);
    }

    const body: unknown = await req.json();
    const parsed = createTaskTypeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { key, name } = parsed.data;

    const existing = await db.taskType.findFirst({
      where: { key, organizationId: orgId },
    });
    if (existing) return errorResponse(`Тип с ключом «${key}» уже существует`, 409);

    const type = await db.taskType.create({
      data: { key, name, isSystem: false, organizationId: orgId },
    });

    return successResponse(type);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-types] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
