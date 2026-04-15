import { NextRequest, NextResponse } from 'next/server';
import { BimModelStatus } from '@prisma/client';
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
 *
 * Состояния ответа:
 *   - status=READY + glbS3Key  → 200 { url }
 *   - status=PROCESSING/CONVERTING (или нет glbS3Key) → 202 { status }
 *   - status=ERROR → 500 { status: 'ERROR', error: convertError }
 *   - status=READY, но glbS3Key отсутствует → 500 (несогласованное состояние)
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
      select: { id: true, status: true, metadata: true },
    });

    if (!model) return errorResponse('Модель не найдена', 404);

    const meta = (model.metadata ?? {}) as Record<string, unknown>;
    const glbS3Key = typeof meta.glbS3Key === 'string' ? meta.glbS3Key : undefined;
    const convertError = typeof meta.convertError === 'string' ? meta.convertError : undefined;

    // Ошибка конвертации — отдаём 500 с сообщением, чтобы UI показал кнопку Reconvert
    if (model.status === BimModelStatus.ERROR) {
      return NextResponse.json(
        { status: 'ERROR', error: convertError ?? 'Ошибка конвертации модели' },
        { status: 500 }
      );
    }

    // Парсинг или конвертация ещё идёт — клиент опросит снова
    if (
      model.status === BimModelStatus.PROCESSING ||
      model.status === BimModelStatus.CONVERTING ||
      !glbS3Key
    ) {
      return NextResponse.json({ status: model.status }, { status: 202 });
    }

    // Несогласованное состояние: READY но без glbS3Key
    if (model.status === BimModelStatus.READY && !glbS3Key) {
      logger.error({ modelId: model.id }, 'BimModel READY but glbS3Key missing');
      return errorResponse('Несогласованное состояние модели: GLB отсутствует', 500);
    }

    // READY + glbS3Key → presigned URL (TTL: 1 час)
    const url = await getDownloadUrl(glbS3Key);
    return successResponse({ url });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM glb-url GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
