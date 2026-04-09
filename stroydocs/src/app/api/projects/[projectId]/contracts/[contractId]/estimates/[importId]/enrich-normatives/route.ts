import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { enrichWorkWithNormatives } from '@/lib/estimates/yandex-gpt';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST — обогащение позиций сметы рекомендуемыми нормативами (СП, ГОСТ, СНиП).
 * Вызывается после финализации chunked Excel pipeline (статус PREVIEW).
 * Для каждой WORK-позиции запрашивает YandexGPT и сохраняет normativeRefs в БД.
 * При ошибке отдельной позиции — пропускает (не кидает весь запрос).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; importId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const estimateImport = await db.estimateImport.findFirst({
      where: {
        id: params.importId,
        contractId: params.contractId,
        status: 'PREVIEW',
      },
    });
    if (!estimateImport) return errorResponse('Импорт не найден или не в статусе PREVIEW', 404);

    // Загружаем только WORK-позиции (материалы не нормируются отдельно)
    const workItems = await db.estimateImportItem.findMany({
      where: {
        importId: params.importId,
        itemType: 'WORK',
        NOT: { status: 'SKIPPED' },
      },
      select: { id: true, rawName: true },
    });

    if (workItems.length === 0) {
      return successResponse({ enriched: 0 });
    }

    logger.info(
      { importId: params.importId, workItemsCount: workItems.length },
      'Начало обогащения нормативами'
    );

    let enriched = 0;

    // Последовательная обработка с rate limiting (внутри enrichWorkWithNormatives)
    for (const item of workItems) {
      try {
        const normativeRefs = await enrichWorkWithNormatives(item.rawName);
        if (normativeRefs.length > 0) {
          await db.estimateImportItem.update({
            where: { id: item.id },
            data: { normativeRefs },
          });
          enriched++;
        }
      } catch {
        // Не прерываем — пропускаем позицию при ошибке
        logger.warn({ itemId: item.id, rawName: item.rawName }, 'Не удалось обогатить нормативами');
      }
    }

    logger.info({ importId: params.importId, enriched }, 'Обогащение нормативами завершено');
    return successResponse({ enriched });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обогащения нормативами');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
