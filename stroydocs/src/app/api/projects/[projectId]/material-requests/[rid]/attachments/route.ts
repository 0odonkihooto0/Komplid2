import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, deleteFile, buildS3Key, getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

/** Получить список вложений заявки на материалы с pre-signed URL для скачивания */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность проекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем принадлежность заявки к проекту
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { attachmentS3Keys: true },
    });
    if (!request) return errorResponse('Заявка на материалы не найдена', 404);

    // Генерируем pre-signed URL для каждого вложения параллельно
    const attachments = await Promise.all(
      request.attachmentS3Keys.map(async (s3Key) => {
        const downloadUrl = await getDownloadUrl(s3Key);
        // Имя файла: последний сегмент ключа без временной метки (формат: {timestamp}_{safeFileName})
        const fileName = s3Key.split('/').pop()!.replace(/^\d+_/, '');
        return { s3Key, fileName, downloadUrl };
      }),
    );

    return successResponse({ attachments });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения вложений заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Загрузить файл и добавить ключ в attachmentS3Keys заявки на материалы */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность проекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем принадлежность заявки к проекту
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { attachmentS3Keys: true },
    });
    if (!request) return errorResponse('Заявка на материалы не найдена', 404);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return errorResponse('Файл не передан', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildS3Key(session.user.organizationId, 'request-attachments', file.name);

    await uploadFile(buffer, s3Key, file.type || 'application/octet-stream');

    // Добавляем ключ в массив вложений заявки
    const updated = await db.materialRequest.update({
      where: { id: params.rid },
      data: { attachmentS3Keys: { push: s3Key } },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ s3Key, attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Удалить файл из S3 и убрать ключ из attachmentS3Keys заявки на материалы */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; rid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность проекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем принадлежность заявки к проекту
    const request = await db.materialRequest.findFirst({
      where: { id: params.rid, projectId: params.projectId },
      select: { attachmentS3Keys: true },
    });
    if (!request) return errorResponse('Заявка на материалы не найдена', 404);

    const { searchParams } = new URL(req.url);
    const s3Key = searchParams.get('key');
    if (!s3Key) return errorResponse('Ключ файла не передан', 400);

    // Проверяем что ключ принадлежит этой заявке
    if (!request.attachmentS3Keys.includes(s3Key)) {
      return errorResponse('Файл не найден в заявке', 404);
    }

    await deleteFile(s3Key);

    // Удаляем ключ из массива вложений заявки
    const updated = await db.materialRequest.update({
      where: { id: params.rid },
      data: { attachmentS3Keys: request.attachmentS3Keys.filter((k) => k !== s3Key) },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления вложения заявки на материалы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
