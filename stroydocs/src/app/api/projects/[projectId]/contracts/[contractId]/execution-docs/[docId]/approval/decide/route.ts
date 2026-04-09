import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { notifyApprovalEvent } from '@/lib/approval/notify';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; docId: string } };

const decideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

/** POST — принять решение по текущему шагу согласования */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = decideSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { decision, comment } = parsed.data;

    // Получить документ для уведомлений
    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId },
      select: { id: true, number: true, type: true, createdById: true },
    });

    // Получить маршрут согласования
    const route = await db.approvalRoute.findUnique({
      where: { executionDocId: params.docId },
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

    // Обновить текущий шаг
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
    const docName = doc ? `${doc.type} ${doc.number ?? ''}`.trim() : params.docId;

    if (decision === 'REJECTED') {
      // При отклонении — весь маршрут отклоняется, документ возвращается
      await db.approvalRoute.update({
        where: { id: route.id },
        data: { status: 'REJECTED' },
      });
      await db.executionDoc.update({
        where: { id: params.docId },
        data: { status: 'REJECTED' },
      });

      // Уведомляем автора документа об отклонении
      if (doc?.createdById) {
        notifyApprovalEvent({
          docId: params.docId,
          docName,
          actorName,
          event: 'rejected',
          targetUserId: doc.createdById,
        }).catch((err) => logger.error({ err }, 'Ошибка уведомления об отклонении'));
      }
    } else {
      // При одобрении — переходим к следующему шагу
      const nextStepIdx = route.currentStepIdx + 1;
      const isLastStep = nextStepIdx >= route.steps.length;

      if (isLastStep) {
        // Все шаги пройдены — маршрут согласован
        await db.approvalRoute.update({
          where: { id: route.id },
          data: { status: 'APPROVED', currentStepIdx: nextStepIdx },
        });
        await db.executionDoc.update({
          where: { id: params.docId },
          data: { status: 'SIGNED' },
        });

        // Уведомляем автора документа о полном согласовании
        if (doc?.createdById) {
          notifyApprovalEvent({
            docId: params.docId,
            docName,
            actorName,
            event: 'approved',
            targetUserId: doc.createdById,
          }).catch((err) => logger.error({ err }, 'Ошибка уведомления об одобрении'));
        }
      } else {
        // Переходим к следующему шагу — уведомляем пользователей со следующей ролью
        await db.approvalRoute.update({
          where: { id: route.id },
          data: { currentStepIdx: nextStepIdx },
        });

        // Находим участников организации с нужной ролью для следующего шага
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
                docId: params.docId,
                docName,
                actorName,
                event: 'approval_required',
                targetUserId: candidate.id,
              }).catch((err) => logger.error({ err }, 'Ошибка уведомления о необходимости согласования'));
            }
          }
        }
      }
    }

    // Вернуть обновлённый маршрут
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
    logger.error({ err: error }, 'Ошибка принятия решения по согласованию');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
