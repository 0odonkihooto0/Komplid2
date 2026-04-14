import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createJournalEntryLinkSchema } from '@/lib/validations/journal-schemas';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; entryId: string } };

/** GET .../entries/[entryId]/links — список связей записи */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверяем запись и принадлежность журнала проекту
    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      include: { journal: { select: { projectId: true } } },
    });
    if (!entry) return errorResponse('Запись не найдена', 404);
    if (entry.journal.projectId !== params.projectId) {
      return errorResponse('Запись не найдена', 404);
    }

    const entrySelect = {
      id: true,
      entryNumber: true,
      description: true,
      date: true,
      journal: { select: { id: true, type: true, title: true } },
    };

    const [sourceLinks, targetLinks] = await Promise.all([
      db.journalEntryLink.findMany({
        where: { sourceEntryId: params.entryId },
        include: {
          targetEntry: { select: entrySelect },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.journalEntryLink.findMany({
        where: { targetEntryId: params.entryId },
        include: {
          sourceEntry: { select: entrySelect },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return successResponse({ sourceLinks, targetLinks });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения связей записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST .../entries/[entryId]/links — создать связь между записями */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверяем исходную запись
    const sourceEntry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      include: { journal: { select: { projectId: true, status: true } } },
    });
    if (!sourceEntry) return errorResponse('Запись не найдена', 404);
    if (sourceEntry.journal.projectId !== params.projectId) {
      return errorResponse('Запись не найдена', 404);
    }
    // Режим хранения — редактирование запрещено
    if (sourceEntry.journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — создание связей запрещено', 403);
    }

    const body = await req.json();
    const parsed = createJournalEntryLinkSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { targetEntryId, linkType } = parsed.data;

    // Нельзя ссылаться на саму себя
    if (targetEntryId === params.entryId) {
      return errorResponse('Запись не может ссылаться на саму себя', 400);
    }

    // Проверяем целевую запись (должна принадлежать тому же проекту)
    const targetEntry = await db.specialJournalEntry.findFirst({
      where: { id: targetEntryId },
      include: { journal: { select: { projectId: true } } },
    });
    if (!targetEntry) return errorResponse('Целевая запись не найдена', 404);
    if (targetEntry.journal.projectId !== params.projectId) {
      return errorResponse('Целевая запись принадлежит другому объекту', 403);
    }

    // Создаём связь (upsert — защита от дубликата при гонке запросов)
    const link = await db.journalEntryLink.upsert({
      where: {
        sourceEntryId_targetEntryId: {
          sourceEntryId: params.entryId,
          targetEntryId,
        },
      },
      create: {
        sourceEntryId: params.entryId,
        targetEntryId,
        linkType: linkType ?? 'GENERIC',
        createdById: session.user.id,
      },
      update: {},
      include: {
        targetEntry: {
          select: {
            id: true,
            entryNumber: true,
            description: true,
            date: true,
            journal: { select: { id: true, type: true, title: true } },
          },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(link);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания связи записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
