import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { notifyApprovalEvent } from '@/lib/approval/notify';

export const dynamic = 'force-dynamic';

const approveSchema = z.object({
  comment: z.string().max(1000).optional(),
});

interface Params { params: { projectId: string; docId: string; wid: string } }

/** POST — согласовать текущий шаг ДО */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const workflow = await db.sEDWorkflow.findFirst({
      where: { id: params.wid, documentId: params.docId },
      include: {
        approvalRoute: {
          include: { steps: { orderBy: { stepIndex: 'asc' } } },
        },
        document: { select: { id: true, title: true, number: true } },
      },
    });
    if (!workflow) return errorResponse('Карточка ДО не найдена', 404);

    const route = workflow.approvalRoute;
    if (!route) return errorResponse('Маршрут согласования не найден', 404);
    if (route.status !== 'PENDING') return errorResponse('Маршрут уже завершён', 400);

    const body = await req.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { comment } = parsed.data;
    const docName = `${workflow.document.title} (${workflow.document.number})`;
    const actorName = `${session.user.lastName} ${session.user.firstName}`;

    const isParallel =
      workflow.workflowType === 'MULTI_APPROVAL' || workflow.workflowType === 'MULTI_SIGNING';

    let targetStep;
    if (isParallel) {
      // Ищем шаг этого пользователя в параллельном наборе
      targetStep = route.steps.find(
        (s) => s.userId === session.user.id && s.status === 'WAITING'
      );
    } else {
      // Последовательный: текущий активный шаг
      targetStep = route.steps[route.currentStepIdx];
      if (targetStep?.userId !== session.user.id) {
        return errorResponse('Вы не являетесь участником текущего шага', 403);
      }
    }

    if (!targetStep) return errorResponse('Активный шаг не найден или уже обработан', 400);
    if (targetStep.status !== 'WAITING') return errorResponse('Шаг уже обработан', 400);

    // Обновляем шаг
    await db.approvalStep.update({
      where: { id: targetStep.id },
      data: {
        status: 'APPROVED',
        comment: comment ?? null,
        decidedAt: new Date(),
      },
    });

    // Обновляем список шагов после изменения
    const updatedSteps = await db.approvalStep.findMany({
      where: { routeId: route.id },
      orderBy: { stepIndex: 'asc' },
    });

    const allApproved = updatedSteps.every((s) => s.status === 'APPROVED');
    const isLastStep = !isParallel && route.currentStepIdx + 1 >= route.steps.length;
    const shouldComplete = isParallel ? allApproved : isLastStep;

    if (shouldComplete) {
      // Завершаем маршрут
      await db.approvalRoute.update({
        where: { id: route.id },
        data: { status: 'APPROVED', currentStepIdx: isParallel ? route.currentStepIdx : route.currentStepIdx + 1 },
      });
      await db.sEDWorkflow.update({
        where: { id: params.wid },
        data: { status: 'APPROVED', completedAt: new Date() },
      });
      await db.sEDDocument.update({
        where: { id: params.docId },
        data: { status: 'APPROVED' },
      });

      // Уведомляем инициатора
      notifyApprovalEvent({
        docId: params.docId,
        docName,
        actorName,
        event: 'approved',
        targetUserId: workflow.initiatorId,
      }).catch((err) => logger.error({ err }, 'Ошибка уведомления инициатора об одобрении'));
    } else if (!isParallel) {
      // Последовательный — переходим к следующему шагу
      const nextStepIdx = route.currentStepIdx + 1;
      await db.approvalRoute.update({
        where: { id: route.id },
        data: { currentStepIdx: nextStepIdx },
      });

      // Уведомляем следующего участника
      const nextStep = route.steps[nextStepIdx];
      if (nextStep?.userId) {
        notifyApprovalEvent({
          docId: params.docId,
          docName,
          actorName,
          event: 'approval_required',
          targetUserId: nextStep.userId,
        }).catch((err) => logger.error({ err }, 'Ошибка уведомления следующего участника'));
      }
    }

    const updatedRoute = await db.approvalRoute.findUnique({
      where: { id: route.id },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return successResponse(updatedRoute);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка согласования шага ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
