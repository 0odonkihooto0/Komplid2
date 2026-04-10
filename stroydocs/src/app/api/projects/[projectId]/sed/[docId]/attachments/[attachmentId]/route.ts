import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { getDownloadUrl, deleteFile } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; docId: string; attachmentId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const attachment = await db.sEDAttachment.findFirst({
      where: { id: params.attachmentId, sedDocId: params.docId },
    });
    if (!attachment) return errorResponse('Вложение не найдено', 404);

    // Проверить что документ принадлежит проекту
    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
      select: { id: true },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const downloadUrl = await getDownloadUrl(attachment.s3Key);

    return successResponse({ attachment, downloadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения вложения СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; docId: string; attachmentId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверить что документ принадлежит проекту и является черновиком
    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
      select: { id: true, status: true },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    // Удалять вложения можно только у черновиков — защита от изменения подписанных документов
    if (doc.status !== 'DRAFT') {
      return errorResponse('Удаление вложений доступно только для черновиков', 409);
    }

    const attachment = await db.sEDAttachment.findFirst({
      where: { id: params.attachmentId, sedDocId: params.docId },
    });
    if (!attachment) return errorResponse('Вложение не найдено', 404);

    // Удалить файл из S3
    await deleteFile(attachment.s3Key);

    await db.sEDAttachment.delete({ where: { id: params.attachmentId } });

    return successResponse({ id: params.attachmentId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления вложения СЭД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
