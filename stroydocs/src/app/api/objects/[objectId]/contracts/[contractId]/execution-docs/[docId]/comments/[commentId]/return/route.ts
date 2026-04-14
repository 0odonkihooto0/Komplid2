import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; docId: string; commentId: string } };

/** POST — вернуть замечание на доработку (RESOLVED → OPEN).
 *  Если документ на согласовании — приостановить маршрут (PENDING → PENDING_REMARKS).
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

    // Вернуть замечание в статус OPEN
    const updated = await db.docComment.update({
      where: { id: params.commentId },
      data: {
        status: 'OPEN',
        resolvedById: null,
        resolvedAt: null,
        actualResolveDate: null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        responsible: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { replies: true } },
      },
    });

    // Проверяем документ — если на согласовании, приостановить маршрут
    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId },
      select: { status: true },
    });

    if (doc?.status === 'IN_REVIEW') {
      // Переводим PENDING → PENDING_REMARKS (если маршрут ещё не приостановлен)
      await db.approvalRoute.updateMany({
        where: { executionDocId: params.docId, status: 'PENDING' },
        data: { status: 'PENDING_REMARKS' },
      });
    }

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка возврата замечания на доработку');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
