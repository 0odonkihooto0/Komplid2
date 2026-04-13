import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; oid: string } };

/**
 * POST — запустить или перезапустить маршрут согласования заказа поставщику.
 * Согласование доступно для заказов в статусе SENT, CONFIRMED, DELIVERED.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const order = await db.supplierOrder.findFirst({
      where: {
        id: params.oid,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
      select: { id: true, status: true, approvalRouteId: true },
    });
    if (!order) return errorResponse('Заказ не найден', 404);

    // Согласование разрешено только для отправленных/подтверждённых/доставленных заказов
    const allowedStatuses = ['SENT', 'CONFIRMED', 'DELIVERED'];
    if (!allowedStatuses.includes(order.status)) {
      return errorResponse(
        'Согласование доступно только для заказов в статусе: Отправлен, Подтверждён, Доставлен',
        409
      );
    }

    // Если маршрут уже был — удалить и создать заново (перезапуск)
    if (order.approvalRouteId) {
      await db.approvalRoute.delete({ where: { id: order.approvalRouteId } });
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
        documentType: 'SupplierOrder',
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

    // Привязать маршрут к заказу
    await db.supplierOrder.update({
      where: { id: params.oid },
      data: { approvalRouteId: route.id },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска согласования заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/**
 * DELETE — остановить / сбросить маршрут согласования заказа поставщику.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const order = await db.supplierOrder.findFirst({
      where: {
        id: params.oid,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
      select: { id: true, approvalRouteId: true },
    });
    if (!order) return errorResponse('Заказ не найден', 404);
    if (!order.approvalRouteId) return errorResponse('Маршрут согласования не найден', 404);

    // Удаляем маршрут — SupplierOrder.approvalRouteId обнулится через SET NULL в FK
    await db.approvalRoute.delete({ where: { id: order.approvalRouteId } });

    return successResponse({ id: params.oid });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сброса согласования заказа поставщику');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
