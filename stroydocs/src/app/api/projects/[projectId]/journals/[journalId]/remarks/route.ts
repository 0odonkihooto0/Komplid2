import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createJournalRemarkSchema } from '@/lib/validations/journal-schemas';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

/** Проверяем принадлежность журнала к объекту и организации */
async function resolveJournal(projectId: string, journalId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) return null;

  const journal = await db.specialJournal.findFirst({
    where: { id: journalId, projectId },
    select: { id: true, responsible: { select: { id: true, firstName: true, lastName: true } } },
  });
  return journal;
}

/** GET .../journals/[jid]/remarks — замечания к журналу */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const journal = await resolveJournal(
      params.projectId,
      params.journalId,
      session.user.organizationId,
    );
    if (!journal) return errorResponse('Журнал не найден', 404);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') ?? 50)));
    const skip = (page - 1) * limit;

    const where = { journalId: params.journalId };

    const [data, total] = await db.$transaction([
      db.journalEntryRemark.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          issuedBy: { select: { id: true, firstName: true, lastName: true } },
          resolvedBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { replies: true } },
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
    logger.error({ err: error }, 'Ошибка получения замечаний журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** POST .../journals/[jid]/remarks — добавить замечание к журналу */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const journal = await resolveJournal(
      params.projectId,
      params.journalId,
      session.user.organizationId,
    );
    if (!journal) return errorResponse('Журнал не найден', 404);

    const body = await req.json();
    const parsed = createJournalRemarkSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const {
      title,
      text,
      issuedById,
      issuedAt,
      remediationDeadline,
      objectDescription,
      attachmentS3Keys,
    } = parsed.data;

    const remark = await db.journalEntryRemark.create({
      data: {
        title,
        text,
        status: 'OPEN',
        journalId: params.journalId,
        authorId: session.user.id,
        issuedById: issuedById ?? null,
        issuedAt: issuedAt ? new Date(issuedAt) : null,
        remediationDeadline: remediationDeadline ? new Date(remediationDeadline) : null,
        objectDescription: objectDescription ?? null,
        attachmentS3Keys: attachmentS3Keys ?? [],
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        issuedBy: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { replies: true } },
      },
    });

    return successResponse(remark);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания замечания журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
