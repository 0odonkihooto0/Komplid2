import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; docId: string; commentId: string } };

/** POST — принять замечание (OPEN → RESOLVED).
 *  Если все замечания документа закрыты и маршрут был приостановлен — возобновить согласование.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const comment = await db.docComment.findFirst({
      where: { id: params.commentId, executionDocId: params.docId },
    });
    if (!comment) return errorResponse('Замечание не найдено', 404);

    // Принять замечание
    const updated = await db.docComment.update({
      where: { id: params.commentId },
      data: {
        status: 'RESOLVED',
        resolvedById: session.user.id,
        resolvedAt: new Date(),
        actualResolveDate: new Date(),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        responsible: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { replies: true } },
      },
    });

    // Проверяем: все ли замечания документа закрыты?
    const openCount = await db.docComment.count({
      where: { executionDocId: params.docId, status: 'OPEN' },
    });

    // Если все закрыты — возобновить приостановленное согласование
    if (openCount === 0) {
      await db.approvalRoute.updateMany({
        where: { executionDocId: params.docId, status: 'PENDING_REMARKS' },
        data: { status: 'PENDING' },
      });
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка принятия замечания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
