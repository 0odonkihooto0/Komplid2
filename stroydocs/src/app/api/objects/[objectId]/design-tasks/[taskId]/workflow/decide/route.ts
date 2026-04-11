import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { notifyApprovalEvent } from '@/lib/approval/notify';

export const dynamic = 'force-dynamic';

type Params = { params: { objectId: string; taskId: string } };

const decideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

/** POST — принять решение по текущему шагу согласования задания на ПИР */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Найти задание, проверить принадлежность к организации через объект строительства
    const task = await db.designTask.findFirst({
      where: {
        id: params.taskId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, number: true, approvalRouteId: true, createdById: true },
    });
    if (!task) return errorResponse('Задание на ПИР не найдено', 404);

    const body = await req.json();
    const parsed = decideSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { decision, comment } = parsed.data;

    // Маршрут согласования привязан напрямую к сущности через approvalRouteId
    if (!task.approvalRouteId) return errorResponse('Маршрут согласования не задан', 404);

    const route = await db.approvalRoute.findUnique({
      where: { id: task.approvalRouteId },
      include: {
        steps: { orderBy: { stepIndex: 'asc' } },
      },
    });
    if (!route) return errorResponse('Маршрут согласования не найден', 404);
    if (route.status !== 'PENDING') return errorResponse('Маршрут уже завершён', 400);

    // Найти текущий шаг
    const currentStep = route.steps[route.currentStepIdx];
    if (!currentStep) return errorResponse('Текущий шаг не найден', 404);
    if (currentStep.status !== 'WAITING') return errorResponse('Шаг уже обработан', 400);

    // Зафиксировать решение по текущему шагу
    await db.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: decision,
        userId: session.user.id,
        comment: comment || null,
        decidedAt: new Date(),
      },
    });

    const actorName = `${session.user.lastName} ${session.user.firstName}`;
    const docName = `Задание на ПИР №${task.number}`;

    if (decision === 'REJECTED') {
      // При отклонении — весь маршрут и задание переходят в статус REJECTED
      await db.approvalRoute.update({
        where: { id: route.id },
        data: { status: 'REJECTED' },
      });
      await db.designTask.update({
        where: { id: params.taskId },
        data: { status: 'REJECTED' },
      });

      // Уведомляем автора об отклонении (fire-and-forget)
      notifyApprovalEvent({
        docId: params.taskId,
        docName,
        actorName,
        event: 'rejected',
        targetUserId: task.createdById,
      }).catch((err) => logger.error({ err }, 'Ошибка уведомления об отклонении задания на ПИР'));
    } else {
      // При одобрении — переходим к следующему шагу или закрываем маршрут
      const nextStepIdx = route.currentStepIdx + 1;
      const isLastStep = nextStepIdx >= route.steps.length;

      if (isLastStep) {
        // Все шаги пройдены — задание полностью согласовано
        await db.approvalRoute.update({
          where: { id: route.id },
          data: { status: 'APPROVED', currentStepIdx: nextStepIdx },
        });
        await db.designTask.update({
          where: { id: params.taskId },
          data: { status: 'APPROVED' },
        });

        // Уведомляем автора о полном согласовании (fire-and-forget)
        notifyApprovalEvent({
          docId: params.taskId,
          docName,
          actorName,
          event: 'approved',
          targetUserId: task.createdById,
        }).catch((err) => logger.error({ err }, 'Ошибка уведомления об одобрении задания на ПИР'));
      } else {
        // Передаём согласование следующему участнику
        await db.approvalRoute.update({
          where: { id: route.id },
          data: { currentStepIdx: nextStepIdx },
        });

        // Уведомляем следующего участника, если он задан явно (fire-and-forget)
        const nextStep = route.steps[nextStepIdx];
        if (nextStep?.userId) {
          notifyApprovalEvent({
            docId: params.taskId,
            docName,
            actorName,
            event: 'approval_required',
            targetUserId: nextStep.userId,
          }).catch((err) =>
            logger.error({ err }, 'Ошибка уведомления о необходимости согласования задания на ПИР'),
          );
        }
      }
    }

    // Вернуть обновлённый маршрут с шагами и данными пользователей
    const updatedRoute = await db.approvalRoute.findUnique({
      where: { id: route.id },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, position: true } },
          },
        },
      },
    });

    return successResponse(updatedRoute);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка принятия решения по согласованию задания на ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
