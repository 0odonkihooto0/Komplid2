import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; id: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const record = await db.contractExecution.findFirst({
      where: { id: params.id, contractId: params.contractId },
    });
    if (!record) return errorResponse('Запись не найдена', 404);

    await db.contractExecution.delete({ where: { id: params.id } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления записи хода исполнения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
