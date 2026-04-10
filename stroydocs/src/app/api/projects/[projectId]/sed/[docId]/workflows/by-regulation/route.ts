import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { notifyApprovalEvent } from '@/lib/approval/notify';
import { getNextSEDWorkflowNumber } from '@/lib/numbering';

export const dynamic = 'force-dynamic';

const byRegulationSchema = z.object({
  regulationId: z.string().uuid('Неверный формат regulationId'),
});

// Тип шага в stepsTemplate регламента
interface RegulationStep {
  role: ParticipantRole;
  userId?: string;
}

interface Params { params: { projectId: string; docId: string } }

/** POST — создать карточку ДО по регламенту организации */
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
    const parsed = byRegulationSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    // Загружаем регламент и проверяем принадлежность к организации
    const regulation = await db.workflowRegulation.findFirst({
      where: { id: parsed.data.regulationId, organizationId: session.user.organizationId },
    });
    if (!regulation) return errorResponse('Регламент не найден', 404);

    const stepsTemplate = regulation.stepsTemplate as unknown as RegulationStep[];
    if (!Array.isArray(stepsTemplate) || stepsTemplate.length === 0) {
      return errorResponse('Регламент не содержит шагов', 422);
    }

    const number = await getNextSEDWorkflowNumber(params.projectId);

    // Участники из регламента (userId может быть не задан)
    const participants = stepsTemplate
      .map((s) => s.userId)
      .filter((id): id is string => typeof id === 'string');

    const workflow = await db.$transaction(async (tx) => {
      const route = await tx.approvalRoute.create({
        data: {
          documentType: 'SEDDocument',
          status: 'PENDING',
          currentStepIdx: 0,
          steps: {
            create: stepsTemplate.map((step, idx) => ({
              stepIndex: idx,
              role: step.role,
              status: 'WAITING' as const,
              ...(step.userId ? { userId: step.userId } : {}),
            })),
          },
        },
      });

      const wf = await tx.sEDWorkflow.create({
        data: {
          number,
          workflowType: 'APPROVAL',
          status: 'IN_PROGRESS',
          documentId: params.docId,
          initiatorId: session.user.id,
          participants,
          observers: [],
          approvalRouteId: route.id,
          regulationId: regulation.id,
          sentAt: new Date(),
        },
        include: {
          initiator: { select: { id: true, firstName: true, lastName: true } },
          regulation: { select: { id: true, name: true } },
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

      await tx.sEDDocument.update({
        where: { id: params.docId },
        data: { status: 'IN_APPROVAL' },
      });

      return wf;
    });

    // Уведомляем первого участника регламента (если задан)
    const firstStepUserId = stepsTemplate[0]?.userId;
    if (firstStepUserId) {
      const actorName = `${session.user.lastName} ${session.user.firstName}`;
      notifyApprovalEvent({
        docId: params.docId,
        docName: `${doc.title} (${doc.number})`,
        actorName,
        event: 'approval_required',
        targetUserId: firstStepUserId,
      }).catch((err) => logger.error({ err }, 'Ошибка уведомления первого участника регламента'));
    }

    return successResponse(workflow);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания ДО по регламенту');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
