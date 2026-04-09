import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; contractId: string; ks2Id: string } };

/** POST — создать КС-3 на основе КС-2 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const act = await db.ks2Act.findFirst({
      where: { id: params.ks2Id, contractId: params.contractId },
      include: { ks3Certificate: true },
    });
    if (!act) return errorResponse('Акт КС-2 не найден', 404);
    if (act.ks3Certificate) return errorResponse('КС-3 уже существует для этого акта', 400);

    const ks3 = await db.ks3Certificate.create({
      data: {
        totalAmount: act.totalAmount,
        contractId: params.contractId,
        ks2ActId: params.ks2Id,
      },
    });

    return successResponse(ks3);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания КС-3');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
