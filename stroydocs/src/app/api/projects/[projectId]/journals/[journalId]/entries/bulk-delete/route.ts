import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { deleteFile } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

/** DELETE .../entries/bulk-delete — массовое удаление записей (только DRAFT, журнал ACTIVE) */
export async function DELETE(req: NextRequest, { params }: Params) {
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
      return errorResponse('Журнал в режиме хранения — удаление запрещено', 403);
    }

    const body = await req.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { ids } = parsed.data;

    // Загружаем записи, принадлежащие этому журналу
    const entries = await db.specialJournalEntry.findMany({
      where: { id: { in: ids }, journalId: params.journalId },
      select: { id: true, status: true, attachmentS3Keys: true },
    });

    // Проверяем что все записи — DRAFT
    const nonDraft = entries.filter((e) => e.status !== 'DRAFT');
    if (nonDraft.length > 0) {
      return errorResponse(
        `Нельзя удалить ${nonDraft.length} запис(и): удаление разрешено только для статуса DRAFT`,
        400,
      );
    }

    const validIds = entries.map((e) => e.id);
    if (validIds.length === 0) {
      return errorResponse('Ни одна из указанных записей не найдена', 404);
    }

    // Удаляем файлы из S3
    const allKeys = entries.flatMap((e) => e.attachmentS3Keys);
    if (allKeys.length > 0) {
      await Promise.all(allKeys.map((key) => deleteFile(key).catch(() => {})));
    }

    // Удаляем записи из БД
    await db.specialJournalEntry.deleteMany({ where: { id: { in: validIds } } });

    return successResponse({ deleted: validIds.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка массового удаления записей журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
