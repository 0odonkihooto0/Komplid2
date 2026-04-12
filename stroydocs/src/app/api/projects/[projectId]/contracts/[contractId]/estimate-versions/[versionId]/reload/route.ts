import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { reloadVersionFromImport } from '@/lib/estimates/reload-version';
import { logEstimateChange } from '@/lib/estimates/change-log';

export const dynamic = 'force-dynamic';

/**
 * POST — перезагрузить смету из исходного файла импорта.
 * Удаляет все главы и позиции, пересоздаёт из EstimateImportItem.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; versionId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const version = await db.estimateVersion.findFirst({
      where: { id: params.versionId, contractId: params.contractId },
    });
    if (!version) return errorResponse('Версия не найдена', 404);

    if (!version.sourceImportId) {
      return errorResponse('Версия не привязана к импорту — перезагрузка невозможна', 400);
    }

    if (version.isBaseline) {
      return errorResponse('Нельзя перезагрузить базовую версию', 400);
    }

    const updated = await reloadVersionFromImport(params.versionId);

    await logEstimateChange({
      versionId: params.versionId,
      userId: session.user.id,
      action: 'version_reloaded',
    });

    logger.info({ versionId: params.versionId }, 'Версия сметы перезагружена из импорта');

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка перезагрузки версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
