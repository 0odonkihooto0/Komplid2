import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; ks2Id: string } };

/** GET — список допзатрат (ДЗ) сметы для акта КС-2 с флагом isExcluded */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта строительства к организации
    const buildingObject = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!buildingObject) return errorResponse('Проект не найден', 404);

    // Найти акт КС-2 по id и contractId
    const act = await db.ks2Act.findFirst({
      where: { id: params.ks2Id, contractId: params.contractId },
    });
    if (!act) return errorResponse('Акт КС-2 не найден', 404);

    // Найти все версии сметы по договору
    const estimateVersions = await db.estimateVersion.findMany({
      where: { contractId: act.contractId },
      select: { id: true },
    });
    const versionIds = estimateVersions.map((v) => v.id);

    // Загрузить допзатраты: привязанные к версиям договора ИЛИ общие для объекта строительства
    const costs = await db.estimateAdditionalCost.findMany({
      where: {
        OR: [
          { versionId: { in: versionIds } },
          { versionId: null, projectId: buildingObject.id },
        ],
      },
      orderBy: { level: 'asc' },
    });

    // Добавляем флаг isExcluded для каждой записи
    const costsWithExcluded = costs.map((cost) => ({
      ...cost,
      isExcluded: act.excludedAdditionalCostIds.includes(cost.id),
    }));

    return successResponse({ costs: costsWithExcluded, totalCount: costs.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения допзатрат для акта КС-2');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
