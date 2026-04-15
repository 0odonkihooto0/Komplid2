import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { getRunClashQueue } from '@/lib/queues/run-clash.queue';

type RouteParams = { params: { projectId: string; modelId: string } };

/** Проверить принадлежность модели организации, вернуть модель с metadata */
async function getModel(modelId: string, projectId: string, organizationId: string) {
  return db.bimModel.findFirst({
    where: {
      id: modelId,
      projectId,
      buildingObject: { organizationId },
    },
    select: { id: true, s3Key: true, name: true, metadata: true },
  });
}

/** GET — вернуть статус и результаты последней проверки коллизий */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionOrThrow();

    const model = await getModel(
      params.modelId,
      params.projectId,
      session.user.organizationId
    );
    if (!model) return errorResponse('Модель не найдена', 404);

    const meta =
      model.metadata !== null && typeof model.metadata === 'object'
        ? (model.metadata as Record<string, unknown>)
        : {};

    return successResponse({
      clashStatus: (meta.clashStatus as string) ?? null,
      clashResults: (meta.clashResults as Record<string, unknown>) ?? null,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM clash GET failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}

/** POST — запустить проверку коллизий */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionOrThrow();

    const body = (await req.json()) as {
      modelIdB?: string;
      tolerance?: number;
      checkDuplicates?: boolean;
      excludedTypes?: string[];
    };

    // Допуск передаётся в мм, конвертируем в метры для IfcOpenShell
    const toleranceM = (body.tolerance ?? 10) / 1000;
    const checkDuplicates = body.checkDuplicates ?? false;
    const excludedTypes = body.excludedTypes ?? [];

    // Найти модель A с проверкой принадлежности тенанту
    const modelA = await getModel(
      params.modelId,
      params.projectId,
      session.user.organizationId
    );
    if (!modelA) return errorResponse('Модель не найдена', 404);

    const s3KeyA = modelA.s3Key;

    // Найти модель B (или использовать A для самопроверки)
    let s3KeyB = s3KeyA;
    if (body.modelIdB && body.modelIdB !== params.modelId) {
      const modelB = await getModel(
        body.modelIdB,
        params.projectId,
        session.user.organizationId
      );
      if (!modelB) return errorResponse('Вторая модель не найдена', 404);
      s3KeyB = modelB.s3Key;
    }

    // Обновить статус → PROCESSING
    const existingMeta = (
      modelA.metadata !== null && typeof modelA.metadata === 'object'
        ? modelA.metadata
        : {}
    ) as Record<string, unknown>;

    await db.bimModel.update({
      where: { id: params.modelId },
      data: {
        metadata: {
          ...existingMeta,
          clashStatus: 'PROCESSING',
          clashResults: null,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Добавить задачу в очередь
    const queue = getRunClashQueue();
    const job = await queue.add('run-clash', {
      modelId: params.modelId,
      s3KeyA,
      s3KeyB,
      tolerance: toleranceM,
      checkDuplicates,
      excludedTypes,
      userId: session.user.id,
    });

    return successResponse({ jobId: job.id, status: 'PROCESSING' });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM clash POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
