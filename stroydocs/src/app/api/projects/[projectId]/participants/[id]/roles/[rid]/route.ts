import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/**
 * DELETE — удалить роль у участника.
 * Проверяем что роль принадлежит участнику данного объекта.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; id: string; rid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Находим роль и проверяем её принадлежность к участнику объекта
    const role = await db.objectParticipantRole.findFirst({
      where: {
        id: params.rid,
        OR: [
          { orgParticipantId: params.id },
          { personId: params.id },
        ],
      },
    });
    if (!role) return errorResponse('Роль не найдена', 404);

    await db.objectParticipantRole.delete({ where: { id: params.rid } });
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления роли участника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
