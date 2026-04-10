import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { params: { projectId: string; docId: string; wid: string; msgId: string } }

/** DELETE — удалить сообщение (только автор или ADMIN) */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const message = await db.sEDWorkflowMessage.findFirst({
      where: { id: params.msgId, workflowId: params.wid },
    });
    if (!message) return errorResponse('Сообщение не найдено', 404);

    // Удаление разрешено только автору или администратору
    if (message.authorId !== session.user.id && session.user.role !== 'ADMIN') {
      return errorResponse('Недостаточно прав для удаления сообщения', 403);
    }

    await db.sEDWorkflowMessage.delete({ where: { id: params.msgId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления сообщения ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
