import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, deleteFile, buildS3Key, getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

/** Загрузить вложение к документу ИД и добавить ключ в attachmentS3Keys */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; docId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return errorResponse('Файл не передан', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildS3Key(session.user.organizationId, 'execution-doc-attachments', file.name);

    await uploadFile(buffer, s3Key, file.type || 'application/octet-stream');

    // Добавляем ключ в массив вложений документа
    const updated = await db.executionDoc.update({
      where: { id: params.docId },
      data: { attachmentS3Keys: { push: s3Key } },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ s3Key, attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения документа ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Получить список вложений с presigned URL для скачивания */
export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; docId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
      select: { attachmentS3Keys: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // Генерируем presigned URL для каждого вложения
    const attachments = await Promise.all(
      doc.attachmentS3Keys.map(async (key) => ({
        s3Key: key,
        fileName: key.split('/').pop() ?? key,
        downloadUrl: await getDownloadUrl(key),
      })),
    );

    return successResponse(attachments);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения вложений документа ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Удалить вложение из S3 и убрать ключ из документа */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; docId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.executionDoc.findFirst({
      where: { id: params.docId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const { searchParams } = new URL(req.url);
    const s3Key = searchParams.get('key');
    if (!s3Key) return errorResponse('Ключ файла не передан', 400);

    if (!doc.attachmentS3Keys.includes(s3Key)) {
      return errorResponse('Файл не найден в документе', 404);
    }

    await deleteFile(s3Key);

    const updated = await db.executionDoc.update({
      where: { id: params.docId },
      data: { attachmentS3Keys: doc.attachmentS3Keys.filter((k) => k !== s3Key) },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления вложения документа ИД');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
