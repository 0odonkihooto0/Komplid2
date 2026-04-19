import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; actId: string } };

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Застройщик (Заказчик)',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Технический надзор',
  SUBCONTRACTOR: 'Субподрядчик',
};

/**
 * POST — автозаполнение участников из ContractParticipant.
 * Возвращает массив participants[] готовый к вставке в форму КС-11/КС-14.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: {
        id: params.actId,
        contractId: params.contractId,
        type: { in: ['KS_11', 'KS_14'] },
      },
    });
    if (!doc) return errorResponse('Акт не найден', 404);

    // Загрузить участников договора с данными организаций
    const contractParticipants = await db.contractParticipant.findMany({
      where: { contractId: params.contractId },
      include: {
        organization: { select: { name: true, inn: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const participants = contractParticipants.map((p) => ({
      role: ROLE_LABELS[p.role] ?? p.role,
      orgName: p.organization.name,
      inn: p.organization.inn ?? undefined,
      representative: p.representativeName ?? undefined,
      position: p.position ?? undefined,
      order: p.appointmentOrder ?? undefined,
    }));

    return successResponse({ participants });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка автозаполнения участников КС-11/КС-14');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
