import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateJournalEntrySchema } from '@/lib/validations/journal-schemas';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; entryId: string } };

/** GET .../entries/[entryId] — карточка записи */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        journal: { select: { id: true, type: true, title: true, status: true, projectId: true } },
        executionDoc: { select: { id: true, number: true, title: true } },
        remarks: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
            resolvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!entry) return errorResponse('Запись не найдена', 404);

    // Проверка принадлежности журнала проекту
    if (entry.journal.projectId !== params.projectId) {
      return errorResponse('Запись не найдена', 404);
    }

    return successResponse(entry);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** PATCH .../entries/[entryId] — обновление записи */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      include: { journal: { select: { id: true, status: true, projectId: true } } },
    });
    if (!entry) return errorResponse('Запись не найдена', 404);
    if (entry.journal.projectId !== params.projectId) {
      return errorResponse('Запись не найдена', 404);
    }

    // Режим хранения — редактирование запрещено
    if (entry.journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — редактирование запрещено', 403);
    }

    const body = await req.json();
    const parsed = updateJournalEntrySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { status: newStatus, date, description, location, normativeRef, weather, temperature, data, inspectionDate, executionDocId } = parsed.data;

    // Допустимые переходы статусов записи
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      DRAFT: ['SUBMITTED'],
      SUBMITTED: ['APPROVED', 'REJECTED'],
      REJECTED: ['SUBMITTED'],
      APPROVED: [],
    };

    if (newStatus) {
      const allowed = ALLOWED_TRANSITIONS[entry.status] ?? [];
      if (!allowed.includes(newStatus)) {
        return errorResponse(
          `Переход из ${entry.status} в ${newStatus} запрещён`,
          400,
        );
      }

      const updated = await db.specialJournalEntry.update({
        where: { id: params.entryId },
        data: { status: newStatus },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          journal: { select: { id: true, type: true, title: true, status: true } },
          executionDoc: { select: { id: true, number: true, title: true } },
          remarks: {
            include: {
              author: { select: { id: true, firstName: true, lastName: true } },
              resolvedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      return successResponse(updated);
    }

    // Обновление контента — только для DRAFT/REJECTED
    if (entry.status !== 'DRAFT' && entry.status !== 'REJECTED') {
      return errorResponse(`Запись в статусе ${entry.status} не может быть отредактирована`, 403);
    }

    // Проверка привязки к ИД
    if (executionDocId) {
      const execDoc = await db.executionDoc.findFirst({
        where: { id: executionDocId, contract: { projectId: params.projectId } },
        select: { id: true },
      });
      if (!execDoc) return errorResponse('Исполнительный документ не найден', 404);
    }

    const updated = await db.specialJournalEntry.update({
      where: { id: params.entryId },
      data: {
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(normativeRef !== undefined ? { normativeRef } : {}),
        ...(weather !== undefined ? { weather } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        ...(data !== undefined ? { data: data as Record<string, string | number | boolean | null> } : {}),
        ...(inspectionDate !== undefined
          ? { inspectionDate: inspectionDate ? new Date(inspectionDate) : null }
          : {}),
        ...(executionDocId !== undefined
          ? { executionDoc: executionDocId ? { connect: { id: executionDocId } } : { disconnect: true } }
          : {}),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        journal: { select: { id: true, type: true, title: true, status: true } },
        executionDoc: { select: { id: true, number: true, title: true } },
        remarks: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
            resolvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE .../entries/[entryId] — удаление записи */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      include: { journal: { select: { id: true, status: true, projectId: true } } },
    });
    if (!entry) return errorResponse('Запись не найдена', 404);
    if (entry.journal.projectId !== params.projectId) {
      return errorResponse('Запись не найдена', 404);
    }

    if (entry.journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — удаление запрещено', 403);
    }
    if (entry.status !== 'DRAFT') {
      return errorResponse('Удаление возможно только для записей в статусе DRAFT', 400);
    }

    await db.specialJournalEntry.delete({ where: { id: params.entryId } });

    return successResponse({ id: params.entryId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
