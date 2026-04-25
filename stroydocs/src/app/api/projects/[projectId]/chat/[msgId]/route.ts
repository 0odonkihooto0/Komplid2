import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { isSystemAdmin } from '@/lib/permissions';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** DELETE — мягкое удаление сообщения (soft delete) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; msgId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const message = await db.chatMessage.findFirst({
      where: { id: params.msgId, projectId: params.projectId },
    });
    if (!message) return errorResponse('Сообщение не найдено', 404);

    if (message.deletedAt) {
      return errorResponse('Сообщение уже удалено', 409);
    }

    // Удалить может только автор сообщения или администратор
    const isAdmin = isSystemAdmin(session);
    const isAuthor = message.authorId === session.user.id;
    if (!isAdmin && !isAuthor) {
      return errorResponse('Удалить сообщение может только его автор или администратор', 403);
    }

    const updated = await db.chatMessage.update({
      where: { id: params.msgId },
      data: { deletedAt: new Date() },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления сообщения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
