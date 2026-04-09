import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { conductMovement } from '@/lib/warehouse/conduct-movement';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; mid: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка существования и принадлежности движения
    const existing = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!existing) return errorResponse('Движение не найдено', 404);

    // Проводить можно только черновые движения
    if (existing.status === 'CONDUCTED') {
      return errorResponse('Движение уже проведено', 409);
    }
    if (existing.status === 'CANCELLED') {
      return errorResponse('Отменённое движение нельзя провести', 409);
    }

    // Проведение движения: обновление остатков на складах
    await conductMovement(params.mid);

    // Возврат актуального состояния движения после проведения
    const movement = await db.warehouseMovement.findFirst({
      where: { id: params.mid },
      include: {
        lines: {
          include: {
            nomenclature: { select: { id: true, name: true, unit: true } },
          },
          orderBy: { id: 'asc' },
        },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(movement);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка проведения складского движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
