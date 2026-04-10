import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; advanceId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const advance = await db.contractAdvance.findFirst({
      where: { id: params.advanceId, contractId: params.contractId },
    });
    if (!advance) return errorResponse('Аванс не найден', 404);

    await db.contractAdvance.delete({ where: { id: params.advanceId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления аванса');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
