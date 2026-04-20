import { NextRequest, NextResponse } from 'next/server';
import { BimModelStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { getConvertIfcQueue } from '@/lib/queues/convert-ifc.queue';

export const dynamic = 'force-dynamic';
type RouteParams = { params: { projectId: string; modelId: string } };

/**
 * POST /api/projects/[projectId]/bim/models/[modelId]/reconvert
 *
 * Перезапустить конвертацию IFC → GLB для застрявшей или упавшей модели.
 * Допускается только если status ∈ { CONVERTING, ERROR } — модели в READY не трогаем,
 * чтобы не ломать рабочий GLB; модели в PROCESSING ещё парсятся.
 *
 * Кладёт новую задачу в очередь convert-ifc, сбрасывает metadata.convertError.
 */
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности модели организации текущего пользователя
    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: {
        id: true,
        s3Key: true,
        status: true,
        metadata: true,
      },
    });

    if (!model) return errorResponse('Модель не найдена', 404);

    // Разрешаем перезапуск только для застрявших/упавших моделей
    if (model.status !== BimModelStatus.CONVERTING && model.status !== BimModelStatus.ERROR) {
      return errorResponse(
        `Перезапуск конвертации возможен только для статусов CONVERTING или ERROR (текущий: ${model.status})`,
        400
      );
    }

    // outputS3Key выводим из исходного s3Key (.ifc → .glb, case-insensitive)
    const outputS3Key = model.s3Key.replace(/\.ifc$/i, '.glb');

    // Очищаем предыдущую ошибку конвертации в metadata, сохраняя остальные поля
    const existingMeta =
      model.metadata !== null && typeof model.metadata === 'object' && !Array.isArray(model.metadata)
        ? (model.metadata as Record<string, unknown>)
        : {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { convertError: _dropped, ...cleanedMeta } = existingMeta;

    // Перевод статуса в CONVERTING + сброс ошибки перед постановкой задачи в очередь
    await db.bimModel.update({
      where: { id: model.id },
      data: {
        status: BimModelStatus.CONVERTING,
        metadata: cleanedMeta as Prisma.InputJsonValue,
      },
    });

    // Ставим задачу в очередь (воркер подхватит её отдельным процессом)
    const queue = getConvertIfcQueue();
    await queue.add('convert-ifc', {
      modelId: model.id,
      s3Key: model.s3Key,
      outputS3Key,
    });

    logger.info(
      { modelId: model.id, userId: session.user.id, outputS3Key },
      'BIM model reconvert enqueued'
    );

    return successResponse({ queued: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM model reconvert failed');
    return errorResponse('Не удалось поставить задачу в очередь', 500);
  }
}
