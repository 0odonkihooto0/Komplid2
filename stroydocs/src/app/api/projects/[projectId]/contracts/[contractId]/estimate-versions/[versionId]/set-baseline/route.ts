import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST — сделать версию базовой (Baseline).
 * Сбрасывает isBaseline=false у всех остальных версий этого договора.
 * Базовая версия становится неизменяемой (isBaseline=true, versionType=BASELINE).
 */
export async function POST(
  _req: NextRequest,
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

    // В транзакции: сбрасываем baseline у других, устанавливаем у этой
    const updated = await db.$transaction(async (tx) => {
      // Сбросить baseline у всех версий договора
      await tx.estimateVersion.updateMany({
        where: { contractId: params.contractId, isBaseline: true },
        data: { isBaseline: false },
      });

      // Установить эту версию как baseline
      return tx.estimateVersion.update({
        where: { id: params.versionId },
        data: {
          isBaseline: true,
          versionType: 'BASELINE',
        },
      });
    });

    logger.info({ versionId: params.versionId, contractId: params.contractId }, 'Версия сметы установлена как базовая');

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка установки базовой версии сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
