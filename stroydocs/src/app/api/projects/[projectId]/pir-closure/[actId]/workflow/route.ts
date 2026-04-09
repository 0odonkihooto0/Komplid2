import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; actId: string } };

// POST — запустить или перезапустить маршрут согласования акта закрытия ПИР
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const act = await db.pIRClosureAct.findFirst({
      where: {
        id: params.actId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, status: true, approvalRouteId: true },
    });
    if (!act) return errorResponse('Акт закрытия не найден', 404);

    // Согласование разрешено только из статуса CONDUCTED
    if (act.status !== 'CONDUCTED' && act.status !== 'IN_APPROVAL') {
      return errorResponse(
        'Согласование доступно только для проведённых актов',
        409
      );
    }

    // Если уже был маршрут — удалить и создать заново (перезапуск)
    if (act.approvalRouteId) {
      await db.approvalRoute.delete({ where: { id: act.approvalRouteId } });
    }

    // Формируем шаги согласования из участников контракта проекта
    const participants = await db.contractParticipant.findMany({
      where: { contract: { projectId: params.projectId } },
      select: { role: true },
      distinct: ['role'],
    });

    const roleOrder: Record<string, number> = {
      SUBCONTRACTOR: 0,
      CONTRACTOR: 1,
      DEVELOPER: 2,
      SUPERVISION: 3,
    };

    const sortedRoles: ParticipantRole[] = participants
      .sort(
        (a: { role: ParticipantRole }, b: { role: ParticipantRole }) =>
          (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
      )
      .map((p: { role: ParticipantRole }) => p.role);

    const route = await db.approvalRoute.create({
      data: {
        status: 'PENDING',
        currentStepIdx: 0,
        steps: {
          create: sortedRoles.map((role, idx) => ({
            stepIndex: idx,
            role,
            status: 'WAITING',
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Привязать маршрут к акту и обновить статус
    await db.pIRClosureAct.update({
      where: { id: params.actId },
      data: { approvalRouteId: route.id, status: 'IN_APPROVAL' },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска согласования акта закрытия ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
