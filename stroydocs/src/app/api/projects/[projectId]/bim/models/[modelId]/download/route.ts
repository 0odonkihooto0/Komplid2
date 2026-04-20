import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';
type RouteParams = { params: { projectId: string; modelId: string } };

/** GET /api/projects/[projectId]/bim/models/[modelId]/download
 *  Возвращает presigned URL IFC-файла (TTL: 1 час) */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionOrThrow();

    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { s3Key: true, fileName: true },
    });
    if (!model) return errorResponse('Модель не найдена', 404);

    const url = await getDownloadUrl(model.s3Key);
    return successResponse({ url, fileName: model.fileName });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM model download URL failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
