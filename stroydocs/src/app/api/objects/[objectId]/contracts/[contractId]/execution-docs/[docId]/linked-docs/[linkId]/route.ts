import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; docId: string; linkId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Поиск связи по ID
    const link = await db.executionDocLink.findFirst({
      where: { id: params.linkId },
    });
    if (!link) return errorResponse('Связь не найдена', 404);

    // Проверка что текущий документ является участником этой связи
    if (link.sourceDocId !== params.docId && link.targetDocId !== params.docId) {
      return errorResponse('Нет прав на удаление этой связи', 403);
    }

    // Удаление связи
    await db.executionDocLink.delete({ where: { id: params.linkId } });

    return successResponse({});
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления связи документов ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
