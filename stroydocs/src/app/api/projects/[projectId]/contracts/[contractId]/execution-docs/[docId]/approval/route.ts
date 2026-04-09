import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; contractId: string; docId: string } };

/** GET — получить маршрут согласования документа */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const route = await db.approvalRoute.findUnique({
      where: { executionDocId: params.docId },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, position: true } },
          },
        },
      },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения маршрута согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST — запустить маршрут согласования */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // Проверить, нет ли уже активного маршрута
    const existing = await db.approvalRoute.findUnique({
      where: { executionDocId: params.docId },
    });
    if (existing && existing.status === 'PENDING') {
      return errorResponse('Маршрут согласования уже запущен', 400);
    }

    // Получить участников договора для формирования шагов
    const participants = await db.contractParticipant.findMany({
      where: { contractId: params.contractId },
      include: { organization: { select: { name: true } } },
      orderBy: { role: 'asc' },
    });

    // Порядок ролей в цепочке согласования
    const roleOrder: Record<string, number> = {
      SUBCONTRACTOR: 0,
      CONTRACTOR: 1,
      DEVELOPER: 2,
      SUPERVISION: 3,
    };

    const sortedParticipants = participants
      .filter((p) => p.role !== 'DEVELOPER' || participants.length > 1) // убираем дублирование
      .sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99));

    // Если уже был маршрут — удалить и создать заново (reset)
    if (existing) {
      await db.approvalRoute.delete({ where: { id: existing.id } });
    }

    const route = await db.approvalRoute.create({
      data: {
        executionDocId: params.docId,
        status: 'PENDING',
        currentStepIdx: 0,
        steps: {
          create: sortedParticipants.map((p, idx) => ({
            stepIndex: idx,
            role: p.role,
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

    // Перевести документ в статус IN_REVIEW
    await db.executionDoc.update({
      where: { id: params.docId },
      data: { status: 'IN_REVIEW' },
    });

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска маршрута согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — сбросить маршрут согласования */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const route = await db.approvalRoute.findUnique({
      where: { executionDocId: params.docId },
    });
    if (!route) return errorResponse('Маршрут не найден', 404);

    await db.approvalRoute.update({
      where: { id: route.id },
      data: { status: 'RESET' },
    });

    // Вернуть документ в черновик
    await db.executionDoc.update({
      where: { id: params.docId },
      data: { status: 'DRAFT' },
    });

    return successResponse({ message: 'Маршрут сброшен' });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сброса маршрута согласования');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
