import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; docId: string } };

// POST — запустить или перезапустить маршрут согласования документа ПИР
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, status: true, approvalRouteId: true },
    });
    if (!doc) return errorResponse('Документ ПИР не найден', 404);

    // Согласование запрещено если документ уже утверждён или аннулирован
    if (doc.status === 'APPROVED' || doc.status === 'CANCELLED') {
      return errorResponse('Нельзя запустить согласование для документа в текущем статусе', 409);
    }

    // Проверить отсутствие активных замечаний (правило бизнес-логики)
    const activeComments = await db.designDocComment.count({
      where: { docId: params.docId, status: 'ACTIVE' },
    });
    if (activeComments > 0) {
      return errorResponse('Невозможно отправить на согласование: есть активные замечания', 422);
    }

    // Если уже был маршрут — удалить и создать заново (перезапуск)
    if (doc.approvalRouteId) {
      await db.approvalRoute.delete({ where: { id: doc.approvalRouteId } });
    }

    // Получить уникальные роли участников контракта для формирования шагов
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

    // Привязать маршрут к документу и перевести в статус «На согласовании»
    await db.designDocument.update({
      where: { id: params.docId },
      data: { approvalRouteId: route.id, status: 'IN_APPROVAL' },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска согласования документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE — остановить и сбросить маршрут согласования документа ПИР
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, approvalRouteId: true },
    });
    if (!doc) return errorResponse('Документ ПИР не найден', 404);

    if (!doc.approvalRouteId) {
      return errorResponse('Маршрут не найден', 404);
    }

    // Удалить маршрут согласования и вернуть документ в статус прошедшего экспертизу
    await db.approvalRoute.delete({ where: { id: doc.approvalRouteId } });

    await db.designDocument.update({
      where: { id: params.docId },
      data: { approvalRouteId: null, status: 'REVIEW_PASSED' },
    });

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сброса согласования документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
