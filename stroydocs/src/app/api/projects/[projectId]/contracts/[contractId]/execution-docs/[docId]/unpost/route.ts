import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** POST — отменить проведение документа (IN_REVIEW → DRAFT)
 *  Доступно только если нет активного маршрута согласования (статус PENDING).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    if (doc.status !== 'IN_REVIEW') {
      return errorResponse(
        'Отмена проведения доступна только для документов со статусом «На проверке»',
        400
      );
    }

    // Проверить: нет ли активного маршрута согласования
    const activeApproval = await db.approvalRoute.findUnique({
      where: { executionDocId: params.docId },
    });
    if (activeApproval && activeApproval.status === 'PENDING') {
      return errorResponse(
        'Невозможно отменить проведение: идёт активное согласование',
        400
      );
    }

    const updated = await db.executionDoc.update({
      where: { id: params.docId },
      data: { status: 'DRAFT' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка отмены проведения документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
