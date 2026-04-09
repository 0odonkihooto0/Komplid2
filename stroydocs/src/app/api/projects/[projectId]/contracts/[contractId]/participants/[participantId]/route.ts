import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; participantId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем, что проект принадлежит организации текущего пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Только ADMIN может удалять участников договора
    if (session.user.role !== 'ADMIN') {
      return errorResponse('Только администратор может удалять участников', 403);
    }

    const participant = await db.contractParticipant.findFirst({
      where: { id: params.participantId, contractId: params.contractId },
    });
    if (!participant) return errorResponse('Участник не найден', 404);

    await db.contractParticipant.delete({ where: { id: params.participantId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления участника');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
