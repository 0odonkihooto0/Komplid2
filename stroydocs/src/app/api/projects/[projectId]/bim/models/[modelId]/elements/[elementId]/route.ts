import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

/** GET /api/projects/[projectId]/bim/models/[modelId]/elements/[elementId]
 *  Полные данные элемента ТИМ-модели: IFC PropertySets и список связей.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; modelId: string; elementId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверить принадлежность через модель → проект → организацию
    const element = await db.bimElement.findFirst({
      where: {
        id: params.elementId,
        modelId: params.modelId,
        model: {
          projectId: params.projectId,
          buildingObject: { organizationId: session.user.organizationId },
        },
      },
      include: {
        links: {
          select: {
            id: true,
            entityType: true,
            entityId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!element) return errorResponse('Элемент не найден', 404);

    return successResponse(element);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM element [elementId] GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
