import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; fundingId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности проекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверка существования источника финансирования
    const source = await db.fundingSource.findFirst({
      where: { id: params.fundingId, projectId: params.objectId },
      select: { id: true },
    });
    if (!source) return errorResponse('Источник финансирования не найден', 404);

    await db.fundingSource.delete({ where: { id: params.fundingId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления источника финансирования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
