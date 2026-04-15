import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { getDownloadUrl } from '@/lib/s3-utils';

type RouteParams = { params: { projectId: string; modelId: string } };

/**
 * GET /api/projects/[projectId]/bim/models/[modelId]/glb-url
 *
 * Возвращает presigned S3 URL для скачивания .glb-файла модели (TTL: 1 час).
 * Если конвертация IFC → GLB ещё не завершена (glbS3Key отсутствует в metadata) →
 * 202 Accepted с { status: 'CONVERTING' } — клиент должен повторить запрос через 3 сек.
 */
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
      select: { id: true, metadata: true },
    });

    if (!model) return errorResponse('Модель не найдена', 404);

    // Извлечь glbS3Key из JSON-поля metadata
    const meta = (model.metadata ?? {}) as Record<string, unknown>;
    const glbS3Key = typeof meta.glbS3Key === 'string' ? meta.glbS3Key : undefined;

    if (!glbS3Key) {
      // Конвертация ещё не завершена — клиент опросит снова через 3 сек
      return NextResponse.json({ status: 'CONVERTING' }, { status: 202 });
    }

    // Сгенерировать presigned URL для скачивания .glb (TTL: 1 час)
    const url = await getDownloadUrl(glbS3Key);
    return successResponse({ url });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM glb-url GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
