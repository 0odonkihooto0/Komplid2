import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateJournalSchema } from '@/lib/validations/journal-schemas';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

/** GET /api/projects/[projectId]/journals/[journalId] — карточка журнала */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        contract: { select: { id: true, number: true, name: true } },
        _count: { select: { entries: true } },
        approvalRoute: {
          select: {
            id: true,
            status: true,
            currentStepIdx: true,
            steps: {
              orderBy: { stepIndex: 'asc' },
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    return successResponse(journal);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** PATCH /api/projects/[projectId]/journals/[journalId] — обновление журнала */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    // Редактирование запрещено в режиме хранения или закрытом
    if (journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — редактирование запрещено', 403);
    }

    const body = await req.json();
    const parsed = updateJournalSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { title, contractId, responsibleId, normativeRef, requisites, startDate, endDate } = parsed.data;

    // Проверка ответственного
    if (responsibleId) {
      const responsible = await db.user.findFirst({
        where: { id: responsibleId, organizationId: session.user.organizationId },
        select: { id: true },
      });
      if (!responsible) return errorResponse('Ответственный не найден', 404);
    }

    // Проверка договора
    if (contractId) {
      const contract = await db.contract.findFirst({
        where: { id: contractId, projectId: params.projectId },
        select: { id: true },
      });
      if (!contract) return errorResponse('Договор не найден', 404);
    }

    const updated = await db.specialJournal.update({
      where: { id: params.journalId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(contractId !== undefined ? { contractId } : {}),
        ...(responsibleId !== undefined ? { responsibleId } : {}),
        ...(normativeRef !== undefined ? { normativeRef } : {}),
        ...(requisites !== undefined ? { requisites: requisites ?? Prisma.JsonNull } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        contract: { select: { id: true, number: true, name: true } },
        _count: { select: { entries: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE /api/projects/[projectId]/journals/[journalId] — удаление журнала */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true, status: true, _count: { select: { entries: true } } },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    if (journal.status !== 'ACTIVE') {
      return errorResponse('Удаление возможно только для журналов в статусе ACTIVE', 400);
    }
    if (journal._count.entries > 0) {
      return errorResponse('Невозможно удалить журнал с записями', 400);
    }

    await db.specialJournal.delete({ where: { id: params.journalId } });

    return successResponse({ id: params.journalId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
