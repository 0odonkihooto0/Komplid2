import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { WorkflowType } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { notifyApprovalEvent } from '@/lib/approval/notify';
import { getNextSEDWorkflowNumber } from '@/lib/numbering';

export const dynamic = 'force-dynamic';

const createWorkflowSchema = z.object({
  workflowType: z.nativeEnum(WorkflowType),
  participants: z.array(z.string().uuid()).min(1, 'Укажите хотя бы одного участника'),
  observers: z.array(z.string().uuid()).optional().default([]),
});

interface Params { params: { projectId: string; docId: string } }

/** GET — список карточек ДО для документа */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [workflows, total] = await Promise.all([
      db.sEDWorkflow.findMany({
        where: { documentId: params.docId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          initiator: { select: { id: true, firstName: true, lastName: true } },
          regulation: { select: { id: true, name: true } },
          approvalRoute: {
            select: { id: true, status: true, currentStepIdx: true, steps: { orderBy: { stepIndex: 'asc' } } },
          },
        },
      }),
      db.sEDWorkflow.count({ where: { documentId: params.docId } }),
    ]);

    return successResponse(workflows, { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — создать карточку ДО по типу */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const body = await req.json();
    const parsed = createWorkflowSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { workflowType, participants, observers } = parsed.data;

    // Параллельные типы: все шаги с одинаковым stepIndex=0
    const isParallel = workflowType === 'MULTI_APPROVAL' || workflowType === 'MULTI_SIGNING';

    // Формируем шаги согласования
    const stepsData = isParallel
      ? participants.map((userId) => ({
          stepIndex: 0,
          role: 'DEVELOPER' as const,
          status: 'WAITING' as const,
          userId,
        }))
      : participants.map((userId, idx) => ({
          stepIndex: idx,
          role: 'DEVELOPER' as const,
          status: 'WAITING' as const,
          userId,
        }));

    // Для одиночных типов берём только первого участника
    const isSingle =
      workflowType === 'DELEGATION' ||
      workflowType === 'REDIRECT' ||
      workflowType === 'REVIEW' ||
      workflowType === 'DIGITAL_SIGNING';

    const finalSteps = isSingle ? [stepsData[0]] : stepsData;

    const number = await getNextSEDWorkflowNumber(params.projectId);

    // Создаём маршрут и карточку ДО в транзакции
    const workflow = await db.$transaction(async (tx) => {
      const route = await tx.approvalRoute.create({
        data: {
          documentType: 'SEDDocument',
          status: 'PENDING',
          currentStepIdx: 0,
          steps: { create: finalSteps },
        },
      });

      const wf = await tx.sEDWorkflow.create({
        data: {
          number,
          workflowType,
          status: 'IN_PROGRESS',
          documentId: params.docId,
          initiatorId: session.user.id,
          participants,
          observers,
          approvalRouteId: route.id,
          sentAt: new Date(),
        },
        include: {
          initiator: { select: { id: true, firstName: true, lastName: true } },
          approvalRoute: {
            include: {
              steps: {
                orderBy: { stepIndex: 'asc' },
                include: { user: { select: { id: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      });

      // Переводим документ в статус "На согласовании"
      await tx.sEDDocument.update({
        where: { id: params.docId },
        data: { status: 'IN_APPROVAL' },
      });

      return wf;
    });

    // Уведомляем всех уникальных участников
    const actorName = `${session.user.lastName} ${session.user.firstName}`;
    const docName = `${doc.title} (${doc.number})`;
    const uniqueParticipants = Array.from(new Set(participants));
    for (const userId of uniqueParticipants) {
      notifyApprovalEvent({
        docId: params.docId,
        docName,
        actorName,
        event: 'approval_required',
        targetUserId: userId,
      }).catch((err) => logger.error({ err }, 'Ошибка уведомления участника ДО'));
    }

    return successResponse(workflow);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания карточки ДО');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
