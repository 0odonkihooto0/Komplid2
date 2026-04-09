import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; actId: string } };

// POST — провести акт закрытия ПИР (DRAFT → CONDUCTED)
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const act = await db.pIRClosureAct.findFirst({
      where: {
        id: params.actId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, status: true },
    });
    if (!act) return errorResponse('Акт закрытия не найден', 404);

    if (act.status !== 'DRAFT') {
      return errorResponse('Акт уже проведён или аннулирован', 409);
    }

    // Проверить, что в акте есть позиции
    const itemCount = await db.pIRClosureItem.count({
      where: { actId: params.actId },
    });
    if (itemCount === 0) {
      return errorResponse('Невозможно провести акт без позиций', 422);
    }

    const updated = await db.pIRClosureAct.update({
      where: { id: params.actId },
      data: { status: 'CONDUCTED' },
      select: { id: true, number: true, status: true },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка проведения акта закрытия ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
