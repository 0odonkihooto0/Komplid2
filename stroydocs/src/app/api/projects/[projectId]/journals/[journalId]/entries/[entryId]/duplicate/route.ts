import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; entryId: string } };

/** POST .../entries/[entryId]/duplicate — дублировать запись журнала */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);
    if (journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — дублирование запрещено', 403);
    }

    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
    });
    if (!entry) return errorResponse('Запись не найдена', 404);

    // Вычислить следующий порядковый номер
    const agg = await db.specialJournalEntry.aggregate({
      _max: { entryNumber: true },
      where: { journalId: params.journalId },
    });
    const nextNumber = (agg._max.entryNumber ?? 0) + 1;

    // Создаём копию записи: новый номер, статус DRAFT, автор — текущий пользователь
    const duplicate = await db.specialJournalEntry.create({
      data: {
        journalId: entry.journalId,
        entryNumber: nextNumber,
        date: entry.date,
        status: 'DRAFT',
        description: entry.description,
        location: entry.location,
        normativeRef: entry.normativeRef,
        weather: entry.weather,
        temperature: entry.temperature,
        data: entry.data ?? undefined,
        inspectionDate: entry.inspectionDate,
        executionDocId: entry.executionDocId,
        sectionId: entry.sectionId,
        authorId: session.user.id,
        attachmentS3Keys: [], // вложения не копируются
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { remarks: true, sourceLinks: true, targetLinks: true } },
      },
    });

    return successResponse(duplicate);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка дублирования записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
