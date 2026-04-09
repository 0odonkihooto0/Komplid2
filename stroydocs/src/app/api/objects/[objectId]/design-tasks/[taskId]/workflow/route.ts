import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; taskId: string } };

// POST — запустить маршрут согласования задания ПИР
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.objectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, status: true, approvalRouteId: true },
    });
    if (!task) return errorResponse('Задание не найдено', 404);

    if (task.status === 'APPROVED' || task.status === 'CANCELLED') {
      return errorResponse('Нельзя запустить согласование для задания в текущем статусе', 409);
    }

    // Проверить отсутствие активных замечаний (правило бизнес-логики)
    const activeComments = await db.designTaskComment.count({
      where: { taskId: params.taskId, status: 'ACTIVE' },
    });
    if (activeComments > 0) {
      return errorResponse('Невозможно отправить на согласование: есть активные замечания', 422);
    }

    // Если уже был маршрут — удалить и создать заново
    if (task.approvalRouteId) {
      await db.approvalRoute.delete({ where: { id: task.approvalRouteId } });
    }

    // Получить участников контракта для формирования шагов согласования
    const participants = await db.contractParticipant.findMany({
      where: { contract: { projectId: params.objectId } },
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
      .sort((a: { role: ParticipantRole }, b: { role: ParticipantRole }) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99))
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

    // Привязать маршрут к заданию и обновить статус
    await db.designTask.update({
      where: { id: params.taskId },
      data: { approvalRouteId: route.id, status: 'IN_APPROVAL' },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска согласования задания ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
