import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { objectId: string; contractId: string; paymentId: string };

// Удалить платёж
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    // Проверить доступ через цепочку: платёж → договор → проект → организация
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const payment = await db.contractPayment.findFirst({
      where: {
        id: params.paymentId,
        contractId: params.contractId,
        contract: { projectId: params.objectId },
      },
    });
    if (!payment) return errorResponse('Платёж не найден', 404);

    await db.contractPayment.delete({ where: { id: params.paymentId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления платежа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
