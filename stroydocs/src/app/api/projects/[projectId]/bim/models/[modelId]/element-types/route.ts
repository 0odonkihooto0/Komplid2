import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

/** GET /api/projects/[projectId]/bim/models/[modelId]/element-types
 *  Лёгкий список пар { ifcGuid, ifcType } для окрашивания модели по типу IFC.
 *  Без пагинации: ответ ~30 байт на строку, подходит для моделей до ~50k элементов.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; modelId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Multi-tenancy: модель обязана принадлежать организации пользователя
    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true },
    });
    if (!model) return errorResponse('Модель не найдена', 404);

    const elements = await db.bimElement.findMany({
      where: { modelId: params.modelId },
      select: { ifcGuid: true, ifcType: true },
      take: 50_000,
    });

    return successResponse(elements);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM element-types GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
