import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { notifyApprovalEvent } from '@/lib/approval/notify';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; rid: string } };

/**
 * POST — запустить или перезапустить маршрут согласования заявки на материалы (ЛРВ).
 * Согласование доступно для любого статуса заявки.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Находим заявку
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { id: true, status: true, approvalRouteId: true, number: true },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);

    // Если маршрут уже был — удалить и создать заново (перезапуск)
    if (request.approvalRouteId) {
      await db.approvalRoute.delete({ where: { id: request.approvalRouteId } });
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

    // Если участников нет — создаём один шаг «Подрядчик» по умолчанию
    if (sortedRoles.length === 0) {
      sortedRoles.push('CONTRACTOR' as ParticipantRole);
    }

    const route = await db.approvalRoute.create({
      data: {
        status: 'PENDING',
        currentStepIdx: 0,
        documentType: 'MaterialRequest',
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

    // Привязать маршрут к заявке и перевести в статус SUBMITTED
    await db.materialRequest.update({
      where: { id: params.rid },
      data: { approvalRouteId: route.id, status: 'SUBMITTED' },
    });

    // Уведомляем согласующих первого шага
    const firstStep = route.steps[0];
    if (firstStep) {
      const roleToUserRole: Record<string, string[]> = {
        DEVELOPER: ['CUSTOMER'],
        CONTRACTOR: ['ADMIN', 'MANAGER'],
        SUPERVISION: ['CONTROLLER'],
        SUBCONTRACTOR: ['WORKER'],
      };
      const userRoles = roleToUserRole[firstStep.role] ?? [];
      if (userRoles.length > 0) {
        const candidates = await db.user.findMany({
          where: {
            organizationId: session.user.organizationId,
            role: { in: userRoles as ('ADMIN' | 'MANAGER' | 'WORKER' | 'CONTROLLER' | 'CUSTOMER')[] },
            isActive: true,
          },
          select: { id: true },
        });
        const actorName = `${session.user.lastName} ${session.user.firstName}`;
        for (const candidate of candidates) {
          notifyApprovalEvent({
            docId: params.rid,
            docName: `ЛРВ ${request.number}`,
            actorName,
            event: 'approval_required',
            targetUserId: candidate.id,
            entityType: 'MaterialRequest',
          }).catch((err) => logger.error({ err }, 'Ошибка уведомления согласующего'));
        }
      }
    }

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска согласования заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE — остановить / сбросить маршрут согласования заявки на материалы.
 * Статус заявки возвращается в DRAFT.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Находим заявку с маршрутом согласования
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { id: true, approvalRouteId: true },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);
    if (!request.approvalRouteId) return errorResponse('Маршрут согласования не найден', 404);

    // Удаляем маршрут (approvalRouteId обнулится через SET NULL в FK)
    await db.approvalRoute.delete({ where: { id: request.approvalRouteId } });

    // Возвращаем заявку в статус Черновик
    await db.materialRequest.update({
      where: { id: params.rid },
      data: { status: 'DRAFT' },
    });

    return successResponse({ id: params.rid });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сброса согласования заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
