import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { notifyApprovalEvent } from '@/lib/approval/notify';

export const dynamic = 'force-dynamic';

const redirectSchema = z.object({
  targetUserId: z.string().uuid('Неверный формат targetUserId'),
  comment: z.string().max(500).optional(),
});

interface Params { params: { projectId: string; docId: string; wid: string } }

/** POST — перенаправить ДО другому участнику */
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
    const parsed = redirectSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { targetUserId, comment } = parsed.data;

    // Проверяем что targetUserId существует в той же организации
    const targetUser = await db.user.findFirst({
      where: { id: targetUserId, organizationId: session.user.organizationId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!targetUser) return errorResponse('Пользователь не найден в организации', 404);

    // Добавляем новый шаг с targetUserId
    const newStepIndex = route.steps.length;
    await db.approvalStep.create({
      data: {
        stepIndex: newStepIndex,
        role: 'DEVELOPER',
        status: 'WAITING',
        userId: targetUserId,
        routeId: route.id,
        ...(comment ? { comment } : {}),
      },
    });

    // Обновляем currentStepIdx чтобы указывал на новый шаг
    await db.approvalRoute.update({
      where: { id: route.id },
      data: { currentStepIdx: newStepIndex },
    });

    // Добавляем нового участника в список участников workflow
    const updatedParticipants = Array.from(new Set([...workflow.participants, targetUserId]));
    await db.sEDWorkflow.update({
      where: { id: params.wid },
      data: { participants: updatedParticipants },
    });

    // Уведомляем нового участника
    const actorName = `${session.user.lastName} ${session.user.firstName}`;
    const docName = `${workflow.document.title} (${workflow.document.number})`;
    notifyApprovalEvent({
      docId: params.docId,
      docName,
      actorName,
      event: 'approval_required',
      targetUserId,
    }).catch((err) => logger.error({ err }, 'Ошибка уведомления при перенаправлении'));

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
    logger.error({ err: error }, 'Ошибка перенаправления ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
