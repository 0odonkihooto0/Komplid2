import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { notifyApprovalEvent } from '@/lib/approval/notify';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; rid: string } };

// Схема валидации тела запроса
const decideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

/** POST — принять решение по текущему шагу согласования заявки на материалы */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = decideSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { decision, comment } = parsed.data;

    // Получить заявку для уведомлений
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: {
        id: true,
        number: true,
        managerId: true,
        responsibleId: true,
        createdById: true,
      },
    });
    if (!request) return errorResponse('Заявка не найдена', 404);

    // Получить маршрут согласования через связь с заявкой
    const route = await db.approvalRoute.findFirst({
      where: { materialRequest: { id: params.rid } },
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

    // Обновить текущий шаг решением
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
    const docName = `ЛРВ ${request.number}`;

    // Список получателей уведомлений (менеджер, ответственный, автор заявки)
    const notifyRecipients = Array.from(
      new Set(
        [request.managerId, request.responsibleId, request.createdById].filter(
          (id): id is string => id !== null && id !== undefined
        )
      )
    );

    if (decision === 'REJECTED') {
      // При отклонении — весь маршрут отклоняется, заявка возвращается в черновик
      await db.approvalRoute.update({
        where: { id: route.id },
        data: { status: 'REJECTED' },
      });
      await db.materialRequest.update({
        where: { id: params.rid },
        data: { status: 'DRAFT' },
      });

      // Уведомляем всех причастных об отклонении
      for (const recipientId of notifyRecipients) {
        notifyApprovalEvent({
          docId: params.rid,
          docName,
          actorName,
          event: 'rejected',
          targetUserId: recipientId,
          entityType: 'MaterialRequest',
        }).catch((err) => logger.error({ err }, 'Ошибка уведомления об отклонении'));
      }
    } else {
      // При одобрении — переходим к следующему шагу
      const nextStepIdx = route.currentStepIdx + 1;
      const isLastStep = nextStepIdx >= route.steps.length;

      if (isLastStep) {
        // Все шаги пройдены — маршрут согласован, заявка переходит в APPROVED
        await db.approvalRoute.update({
          where: { id: route.id },
          data: { status: 'APPROVED', currentStepIdx: nextStepIdx },
        });
        await db.materialRequest.update({
          where: { id: params.rid },
          data: { status: 'APPROVED' },
        });

        // Уведомляем всех причастных о полном согласовании
        for (const recipientId of notifyRecipients) {
          notifyApprovalEvent({
            docId: params.rid,
            docName,
            actorName,
            event: 'approved',
            targetUserId: recipientId,
            entityType: 'MaterialRequest',
          }).catch((err) => logger.error({ err }, 'Ошибка уведомления об одобрении'));
        }
      } else {
        // Переходим к следующему шагу — уведомляем согласующих следующего шага
        await db.approvalRoute.update({
          where: { id: route.id },
          data: { currentStepIdx: nextStepIdx },
        });

        const nextStep = route.steps[nextStepIdx];
        if (nextStep) {
          const roleToUserRole: Record<string, string[]> = {
            DEVELOPER: ['CUSTOMER'],
            CONTRACTOR: ['ADMIN', 'MANAGER'],
            SUPERVISION: ['CONTROLLER'],
            SUBCONTRACTOR: ['WORKER'],
          };
          const userRoles = roleToUserRole[nextStep.role] ?? [];
          if (userRoles.length > 0) {
            const candidates = await db.user.findMany({
              where: {
                organizationId: session.user.organizationId,
                role: { in: userRoles as ('ADMIN' | 'MANAGER' | 'WORKER' | 'CONTROLLER' | 'CUSTOMER')[] },
                isActive: true,
              },
              select: { id: true },
            });
            for (const candidate of candidates) {
              notifyApprovalEvent({
                docId: params.rid,
                docName,
                actorName,
                event: 'approval_required',
                targetUserId: candidate.id,
                entityType: 'MaterialRequest',
              }).catch((err) => logger.error({ err }, 'Ошибка уведомления о необходимости согласования'));
            }
          }
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
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return successResponse(updatedRoute);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка принятия решения по согласованию заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
