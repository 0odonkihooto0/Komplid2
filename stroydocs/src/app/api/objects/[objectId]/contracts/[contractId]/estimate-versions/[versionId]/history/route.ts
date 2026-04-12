import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { getVersionHistory } from '@/lib/estimates/change-log';

export const dynamic = 'force-dynamic';

/**
 * GET /estimate-versions/[versionId]/history
 * История изменений версии сметы с пагинацией
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50));
    const skip = (page - 1) * limit;

    const { data, total } = await getVersionHistory(params.versionId, limit, skip);

    return successResponse(data, {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения истории изменений сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
