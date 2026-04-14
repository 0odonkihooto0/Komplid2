import { NextRequest, NextResponse } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

// POST — запустить или перезапустить маршрут согласования журнала
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта к организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true, status: true, number: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    // Согласование доступно только для активных журналов
    if (journal.status !== 'ACTIVE') {
      return errorResponse('Согласование доступно только для активных журналов', 409);
    }

    // Если уже был маршрут — удалить (перезапуск)
    // FK хранится на стороне ApprovalRoute.specialJournalId
    const existingRoute = await db.approvalRoute.findUnique({
      where: { specialJournalId: params.journalId },
      select: { id: true },
    });
    if (existingRoute) {
      await db.approvalRoute.delete({ where: { id: existingRoute.id } });
    }

    // Формируем шаги согласования из участников контракта проекта
    const participants = await db.contractParticipant.findMany({
      where: { contract: { projectId: params.projectId } },
      select: { role: true },
      distinct: ['role'],
    });

    const roleOrder: Record<string, number> = {
      SUBCONTRACTOR: 0,
      CONTRACTOR: 1,
      DEVELOPER: 2,
      SUPERVISION: 3,
    };

    const sortedRoles: ParticipantRole[] = participants
      .sort(
        (a: { role: ParticipantRole }, b: { role: ParticipantRole }) =>
          (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99),
      )
      .map((p: { role: ParticipantRole }) => p.role);

    // Создаём маршрут с FK specialJournalId на стороне ApprovalRoute
    const route = await db.approvalRoute.create({
      data: {
        status: 'PENDING',
        currentStepIdx: 0,
        specialJournalId: params.journalId,
        steps: {
          create: sortedRoles.map((role, idx) => ({
            stepIndex: idx,
            role,
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

    return successResponse(route);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка запуска согласования журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE — остановить и сбросить маршрут согласования журнала
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    const route = await db.approvalRoute.findUnique({
      where: { specialJournalId: params.journalId },
      select: { id: true },
    });
    if (!route) return errorResponse('Маршрут согласования не найден', 404);

    await db.approvalRoute.delete({ where: { id: route.id } });

    return successResponse({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка сброса согласования журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// GET — получить текущий маршрут согласования журнала
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    const route = await db.approvalRoute.findUnique({
      where: { specialJournalId: params.journalId },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return successResponse(route ?? null);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения маршрута согласования журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
