import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; docId: string } };

/**
 * POST /api/projects/[projectId]/design-docs/[docId]/soft-delete
 * Пометить документ ПИР как удалённый (isDeleted=true).
 * Документ скрывается из стандартного списка, но не удаляется из БД.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        isDeleted: false,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const updated = await db.designDocument.update({
      where: { id: params.docId },
      data: { isDeleted: true, deletedAt: new Date() },
      select: { id: true, isDeleted: true, deletedAt: true },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка мягкого удаления документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
