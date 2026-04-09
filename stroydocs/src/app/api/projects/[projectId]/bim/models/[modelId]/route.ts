import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { getDownloadUrl } from '@/lib/s3-utils';

type RouteParams = { params: { projectId: string; modelId: string } };

/** Проверить принадлежность модели организации */
async function getModel(modelId: string, projectId: string, organizationId: string) {
  return db.bimModel.findFirst({
    where: {
      id: modelId,
      projectId,
      buildingObject: { organizationId },
    },
  });
}

/** GET /api/projects/[projectId]/bim/models/[modelId] — данные модели + версии */
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getSessionOrThrow();

    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      include: {
        section: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        versions: {
          orderBy: { version: 'desc' },
          include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!model) return errorResponse('Модель не найдена', 404);

    // Получить download URL для текущего IFC-файла (TTL: 1 час)
    const downloadUrl = await getDownloadUrl(model.s3Key);

    // Статистика элементов
    const elementCount = model.elementCount ?? await db.bimElement.count({
      where: { modelId: model.id },
    });

    return successResponse({ ...model, downloadUrl, elementCount });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM model GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}

/** DELETE /api/projects/[projectId]/bim/models/[modelId] — удалить модель */
export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getSessionOrThrow();

    const model = await getModel(
      params.modelId,
      params.projectId,
      session.user.organizationId
    );
    if (!model) return errorResponse('Модель не найдена', 404);

    // Удаляем запись — Prisma каскадно удалит версии, элементы и связи
    await db.bimModel.delete({ where: { id: params.modelId } });

    return successResponse({ id: params.modelId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM model DELETE failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
