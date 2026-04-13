import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, deleteFile, buildS3Key } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

/** Загрузить файл и добавить ключ в attachmentS3Keys задачи ГПР */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string; taskId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const task = await db.ganttTask.findFirst({
      where: { id: params.taskId, versionId: params.versionId },
    });
    if (!task) return errorResponse('Задача не найдена', 404);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return errorResponse('Файл не передан', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildS3Key(session.user.organizationId, 'gantt-attachments', file.name);

    await uploadFile(buffer, s3Key, file.type || 'application/octet-stream');

    // Добавляем ключ в массив вложений задачи
    const updated = await db.ganttTask.update({
      where: { id: params.taskId },
      data: { attachmentS3Keys: { push: s3Key } },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ s3Key, attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения задачи ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Удалить файл из S3 и убрать ключ из attachmentS3Keys задачи ГПР */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string; taskId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const task = await db.ganttTask.findFirst({
      where: { id: params.taskId, versionId: params.versionId },
    });
    if (!task) return errorResponse('Задача не найдена', 404);

    const { searchParams } = new URL(req.url);
    const s3Key = searchParams.get('key');
    if (!s3Key) return errorResponse('Ключ файла не передан', 400);

    // Проверяем что ключ принадлежит этой задаче
    if (!task.attachmentS3Keys.includes(s3Key)) {
      return errorResponse('Файл не найден в задаче', 404);
    }

    await deleteFile(s3Key);

    const updated = await db.ganttTask.update({
      where: { id: params.taskId },
      data: { attachmentS3Keys: task.attachmentS3Keys.filter((k) => k !== s3Key) },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления вложения задачи ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
