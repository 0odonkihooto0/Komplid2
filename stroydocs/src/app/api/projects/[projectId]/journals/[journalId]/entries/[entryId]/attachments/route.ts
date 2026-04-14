import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, deleteFile, buildS3Key } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string; entryId: string } };

/** POST .../entries/[entryId]/attachments — загрузить файл вложения к записи журнала */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      select: { id: true },
    });
    if (!entry) return errorResponse('Запись не найдена', 404);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return errorResponse('Файл не передан', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildS3Key(session.user.organizationId, 'journal-entry-attachments', file.name);

    await uploadFile(buffer, s3Key, file.type || 'application/octet-stream');

    // Добавляем ключ в массив вложений записи
    const updated = await db.specialJournalEntry.update({
      where: { id: params.entryId },
      data: { attachmentS3Keys: { push: s3Key } },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ s3Key, attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE .../entries/[entryId]/attachments?key=... — удалить файл вложения */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const entry = await db.specialJournalEntry.findFirst({
      where: { id: params.entryId, journalId: params.journalId },
      select: { id: true, attachmentS3Keys: true },
    });
    if (!entry) return errorResponse('Запись не найдена', 404);

    const { searchParams } = new URL(req.url);
    const s3Key = searchParams.get('key');
    if (!s3Key) return errorResponse('Ключ файла не передан', 400);

    // Проверяем что ключ принадлежит этой записи
    if (!entry.attachmentS3Keys.includes(s3Key)) {
      return errorResponse('Файл не найден в записи', 404);
    }

    await deleteFile(s3Key);

    const updated = await db.specialJournalEntry.update({
      where: { id: params.entryId },
      data: { attachmentS3Keys: entry.attachmentS3Keys.filter((k) => k !== s3Key) },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления вложения записи журнала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
