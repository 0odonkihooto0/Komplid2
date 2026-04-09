import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { notifyApprovalEvent } from '@/lib/approval/notify';

export const dynamic = 'force-dynamic';

interface Params { params: { projectId: string; id: string } }

const decideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

/** POST — принять решение по текущему шагу согласования предписания */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const { id } = params;

    const body = await req.json();
    const parsed = decideSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { decision, comment } = parsed.data;

    // Получаем предписание для проверки прав и получения данных для уведомлений
    const prescription = await db.prescription.findFirst({
      where: { id, inspection: { buildingObject: { organizationId: session.user.organizationId } } },
      select: {
        id: true,
        number: true,
        approvalRouteId: true,
        issuedById: true,
      },
    });
    if (!prescription) return errorResponse('Предписание не найдено', 404);
    if (!prescription.approvalRouteId) return errorResponse('Маршрут согласования не найден', 404);

    // Получаем маршрут с шагами
    const route = await db.approvalRoute.findUnique({
      where: { id: prescription.approvalRouteId },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });
    if (!route) return errorResponse('Маршрут согласования не найден', 404);
    if (route.status !== 'PENDING') return errorResponse('Маршрут уже завершён', 400);

    const currentStep = route.steps[route.currentStepIdx];
    if (!currentStep) return errorResponse('Текущий шаг не найден', 404);
    if (currentStep.status !== 'WAITING') return errorResponse('Шаг уже обработан', 400);

    // Фиксируем решение текущего шага
    await db.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: decision,
        userId: session.user.id,
        comment: comment ?? null,
        decidedAt: new Date(),
      },
    });

    const actorName = `${session.user.lastName} ${session.user.firstName}`;
    const docName = `Предписание №${prescription.number}`;

    if (decision === 'REJECTED') {
      // Весь маршрут отклоняется
      await db.approvalRoute.update({
        where: { id: route.id },
        data: { status: 'REJECTED' },
      });

      // Уведомляем автора предписания об отклонении
      if (prescription.issuedById) {
        notifyApprovalEvent({
          docId: prescription.id,
          docName,
          actorName,
          event: 'rejected',
          targetUserId: prescription.issuedById,
        }).catch((err) => logger.error({ err }, 'Ошибка уведомления об отклонении предписания'));
      }
    } else {
      const nextStepIdx = route.currentStepIdx + 1;
      const isLastStep = nextStepIdx >= route.steps.length;

      if (isLastStep) {
        // Все шаги пройдены — маршрут согласован
        await db.approvalRoute.update({
          where: { id: route.id },
          data: { status: 'APPROVED', currentStepIdx: nextStepIdx },
        });

        // Уведомляем автора предписания о полном согласовании
        if (prescription.issuedById) {
          notifyApprovalEvent({
            docId: prescription.id,
            docName,
            actorName,
            event: 'approved',
            targetUserId: prescription.issuedById,
          }).catch((err) => logger.error({ err }, 'Ошибка уведомления о согласовании предписания'));
        }
      } else {
        // Переходим к следующему шагу
        await db.approvalRoute.update({
          where: { id: route.id },
          data: { currentStepIdx: nextStepIdx },
        });

        // Уведомляем пользователей со следующей ролью
        const nextStep = route.steps[nextStepIdx];
        if (nextStep) {
          const roleToUserRole: Record<string, string[]> = {
            DEVELOPER:     ['CUSTOMER'],
            CONTRACTOR:    ['ADMIN', 'MANAGER'],
            SUPERVISION:   ['CONTROLLER'],
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
                docId: prescription.id,
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

    // Возвращаем обновлённый маршрут
    const updatedRoute = await db.approvalRoute.findUnique({
      where: { id: route.id },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: { user: { select: { id: true, firstName: true, lastName: true, position: true } } },
        },
      },
    });

    return successResponse(updatedRoute);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка принятия решения по согласованию предписания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
