import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createJournalEntrySchema } from '@/lib/validations/journal-schemas';
import type { JournalEntryStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

/** GET /api/projects/[projectId]/journals/[journalId]/entries — записи журнала */
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
      select: { id: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') ?? 50)));
    const skip = (page - 1) * limit;
    const status = sp.get('status') ?? undefined;
    const from = sp.get('from') ?? undefined;
    const to = sp.get('to') ?? undefined;

    const where = {
      journalId: params.journalId,
      ...(status ? { status: status as JournalEntryStatus } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await db.$transaction([
      db.specialJournalEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { entryNumber: 'asc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { remarks: true } },
        },
      }),
      db.specialJournalEntry.count({ where }),
    ]);

    return successResponse(data, {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения записей журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST /api/projects/[projectId]/journals/[journalId]/entries — создание записи */
export async function POST(req: NextRequest, { params }: Params) {
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

    // Режим хранения — запись запрещена
    if (journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — редактирование запрещено', 403);
    }

    const body = await req.json();
    const parsed = createJournalEntrySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { date, description, location, normativeRef, weather, temperature, data, inspectionDate, executionDocId, sectionId } = parsed.data;

    // Проверка привязки к ИД
    if (executionDocId) {
      const execDoc = await db.executionDoc.findFirst({
        where: { id: executionDocId, contract: { projectId: params.projectId } },
        select: { id: true },
      });
      if (!execDoc) return errorResponse('Исполнительный документ не найден', 404);
    }

    // Проверка принадлежности раздела журналу
    if (sectionId) {
      const sec = await db.journalSection.findFirst({
        where: { id: sectionId, journalId: params.journalId },
        select: { id: true },
      });
      if (!sec) return errorResponse('Раздел не найден', 404);
    }

    // Авто-нумерация entryNumber в транзакции с advisory lock
    const entry = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const lockKey = `journal-entry:${params.journalId}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const result = await tx.$queryRaw<Array<{ max_num: number | null }>>`
        SELECT MAX("entryNumber") AS max_num
        FROM special_journal_entries
        WHERE "journalId" = ${params.journalId}
      `;
      const nextNum = (result[0]?.max_num ?? 0) + 1;

      return tx.specialJournalEntry.create({
        data: {
          entryNumber: nextNum,
          date: new Date(date),
          description,
          location: location ?? null,
          normativeRef: normativeRef ?? null,
          weather: weather ?? null,
          temperature: temperature ?? null,
          data: data !== undefined ? data as Prisma.InputJsonValue : undefined,
          inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
          executionDocId: executionDocId ?? null,
          sectionId: sectionId ?? null,
          journalId: params.journalId,
          authorId: session.user.id,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { remarks: true } },
        },
      });
    });

    return successResponse(entry);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
