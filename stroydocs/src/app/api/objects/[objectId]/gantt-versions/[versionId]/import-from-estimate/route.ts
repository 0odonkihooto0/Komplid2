import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { importFromEstimate } from '@/lib/gantt/import-from-estimate';

export const dynamic = 'force-dynamic';

const importSchema = z.object({
  estimateVersionId: z.string().uuid(),
});

/**
 * POST /api/objects/[objectId]/gantt-versions/[versionId]/import-from-estimate
 * Импортировать структуру сметы в версию ГПР.
 * Главы сметы становятся родительскими задачами, позиции WORK — дочерними.
 * Добавляет к существующим задачам (не перезаписывает).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации (multi-tenancy)
    const object = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    // Проверка что версия ГПР принадлежит данному объекту
    const version = await db.ganttVersion.findFirst({
      where: { id: params.versionId, projectId: params.objectId },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    const body: unknown = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { estimateVersionId } = parsed.data;

    // Проверка что сметная версия принадлежит тому же объекту (через контракт)
    const estVersion = await db.estimateVersion.findFirst({
      where: { id: estimateVersionId },
      include: { contract: { select: { projectId: true } } },
    });
    if (!estVersion) return errorResponse('Версия сметы не найдена', 404);
    if (estVersion.contract.projectId !== params.objectId) {
      return errorResponse('Версия сметы не принадлежит данному объекту', 403);
    }

    // Выполняем импорт в транзакции
    await db.$transaction(async (tx) => {
      await importFromEstimate(tx, params.versionId, estimateVersionId);
    });

    return successResponse({ message: 'Импорт завершён' });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка импорта сметы в версию ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
