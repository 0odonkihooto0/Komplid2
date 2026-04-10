import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { notifyApprovalEvent } from '@/lib/approval/notify';

export const dynamic = 'force-dynamic';

const rejectSchema = z.object({
  comment: z.string().min(1, 'Укажите причину отклонения').max(1000),
});

interface Params { params: { projectId: string; docId: string; wid: string } }

/** POST — отклонить ДО */
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
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { comment } = parsed.data;

    const isParallel =
      workflow.workflowType === 'MULTI_APPROVAL' || workflow.workflowType === 'MULTI_SIGNING';

    let targetStep;
    if (isParallel) {
      targetStep = route.steps.find(
        (s) => s.userId === session.user.id && s.status === 'WAITING'
      );
    } else {
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
      data: { status: 'REJECTED', comment, decidedAt: new Date() },
    });

    // Переводим маршрут и ДО в статус REJECTED
    await db.approvalRoute.update({
      where: { id: route.id },
      data: { status: 'REJECTED' },
    });
    await db.sEDWorkflow.update({
      where: { id: params.wid },
      data: { status: 'REJECTED', completedAt: new Date() },
    });
    await db.sEDDocument.update({
      where: { id: params.docId },
      data: { status: 'REJECTED' },
    });

    // Уведомляем инициатора об отклонении
    const actorName = `${session.user.lastName} ${session.user.firstName}`;
    const docName = `${workflow.document.title} (${workflow.document.number})`;
    notifyApprovalEvent({
      docId: params.docId,
      docName,
      actorName,
      event: 'rejected',
      targetUserId: workflow.initiatorId,
    }).catch((err) => logger.error({ err }, 'Ошибка уведомления инициатора об отклонении'));

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
    logger.error({ err: error }, 'Ошибка отклонения ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
