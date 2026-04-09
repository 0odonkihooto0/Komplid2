import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { recalculateVersion } from '@/lib/estimates/recalculate';

export const dynamic = 'force-dynamic';

/**
 * POST — пересчитать итоги версии сметы:
 * totalPrice = volume × unitPrice для каждой позиции,
 * затем агрегация по главам и версии.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    await recalculateVersion(params.versionId);

    const updated = await db.estimateVersion.findUnique({
      where: { id: params.versionId },
      select: { id: true, name: true, totalAmount: true, totalLabor: true, totalMat: true },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка пересчёта версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
