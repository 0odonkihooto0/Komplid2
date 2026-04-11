import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; docId: string } };

/**
 * POST /api/projects/[projectId]/design-docs/[docId]/restore
 * Восстановить мягко удалённый документ ПИР (isDeleted=false).
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        isDeleted: true,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!doc) return errorResponse('Удалённый документ не найден', 404);

    const updated = await db.designDocument.update({
      where: { id: params.docId },
      data: { isDeleted: false, deletedAt: null },
      select: { id: true, isDeleted: true, deletedAt: true },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка восстановления документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
