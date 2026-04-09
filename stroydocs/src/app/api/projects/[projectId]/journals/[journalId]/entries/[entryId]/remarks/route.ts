import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createRemarkSchema } from '@/lib/validations/journal-schemas';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; entryId: string } };

/** GET .../remarks — замечания к записи */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка цепочки: запись → журнал → проект
    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      include: { journal: { select: { projectId: true } } },
    });
    if (!entry || entry.journal.projectId !== params.projectId) {
      return errorResponse('Запись не найдена', 404);
    }

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') ?? 50)));
    const skip = (page - 1) * limit;

    const where = { entryId: params.entryId };

    const [data, total] = await db.$transaction([
      db.journalEntryRemark.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.journalEntryRemark.count({ where }),
    ]);

    return successResponse(data, {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения замечаний');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST .../remarks — добавить замечание */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    // Проверка цепочки: запись → журнал → проект
    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      include: { journal: { select: { projectId: true } } },
    });
    if (!entry || entry.journal.projectId !== params.projectId) {
      return errorResponse('Запись не найдена', 404);
    }

    const body = await req.json();
    const parsed = createRemarkSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { text, deadline } = parsed.data;

    const remark = await db.journalEntryRemark.create({
      data: {
        text,
        status: 'OPEN',
        deadline: deadline ? new Date(deadline) : null,
        entryId: params.entryId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(remark);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания замечания');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
