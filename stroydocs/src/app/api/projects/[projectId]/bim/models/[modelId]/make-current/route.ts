import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
type RouteParams = { params: { projectId: string; modelId: string } };

/** POST /api/projects/[projectId]/bim/models/[modelId]/make-current
 *  Сделать модель актуальной: isCurrent=true у текущей, false у остальных того же раздела */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionOrThrow();

    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
    });
    if (!model) return errorResponse('Модель не найдена', 404);

    // Транзакция: сбрасываем isCurrent у остальных моделей того же раздела, ставим true у текущей
    await db.$transaction([
      db.bimModel.updateMany({
        where: {
          projectId: params.projectId,
          sectionId: model.sectionId,
          id: { not: params.modelId },
        },
        data: { isCurrent: false },
      }),
      db.bimModel.update({
        where: { id: params.modelId },
        data: { isCurrent: true },
      }),
    ]);

    return successResponse({ id: params.modelId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM model make-current failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
