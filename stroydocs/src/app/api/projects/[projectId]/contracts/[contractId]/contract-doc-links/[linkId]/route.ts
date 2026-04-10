import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; contractId: string; linkId: string };

// Удалить привязку документа от договора
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const link = await db.contractDocLink.findFirst({
      where: { id: params.linkId, contractId: params.contractId },
    });
    if (!link) return errorResponse('Привязка не найдена', 404);

    await db.contractDocLink.delete({ where: { id: params.linkId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления привязки документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
