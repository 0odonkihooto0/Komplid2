import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { id } = await params;

    if (session.user.role !== 'ADMIN') {
      return errorResponse('Удаление типов задач доступно только администраторам', 403);
    }

    const type = await db.taskType.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { tasks: true } } },
    });
    if (!type) return errorResponse('Тип задачи не найден', 404);

    if (type.isSystem) {
      return errorResponse('Системные типы задач нельзя удалять', 403);
    }

    if (type._count.tasks > 0) {
      return errorResponse('Нельзя удалить тип задачи, пока он используется в задачах', 409);
    }

    await db.taskType.delete({ where: { id } });
    return successResponse({ id });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[task-types/id] DELETE:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
