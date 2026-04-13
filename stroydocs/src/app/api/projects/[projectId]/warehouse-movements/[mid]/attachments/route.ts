import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, deleteFile, buildS3Key, getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

/** Получить список вложений складского движения с pre-signed URL для скачивания */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; mid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность проекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем принадлежность складского движения к проекту
    const movement = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { attachmentS3Keys: true },
    });
    if (!movement) return errorResponse('Складское движение не найдено', 404);

    // Генерируем pre-signed URL для каждого вложения параллельно
    const attachments = await Promise.all(
      movement.attachmentS3Keys.map(async (s3Key) => {
        const downloadUrl = await getDownloadUrl(s3Key);
        // Имя файла: последний сегмент ключа без временной метки (формат: {timestamp}_{safeFileName})
        const fileName = s3Key.split('/').pop()!.replace(/^\d+_/, '');
        return { s3Key, fileName, downloadUrl };
      }),
    );

    return successResponse({ attachments });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения вложений складского движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Загрузить файл и добавить ключ в attachmentS3Keys складского движения */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; mid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность проекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем принадлежность складского движения к проекту
    const movement = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { attachmentS3Keys: true },
    });
    if (!movement) return errorResponse('Складское движение не найдено', 404);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return errorResponse('Файл не передан', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildS3Key(session.user.organizationId, 'movement-attachments', file.name);

    await uploadFile(buffer, s3Key, file.type || 'application/octet-stream');

    // Добавляем ключ в массив вложений складского движения
    const updated = await db.warehouseMovement.update({
      where: { id: params.mid },
      data: { attachmentS3Keys: { push: s3Key } },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ s3Key, attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения складского движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Удалить файл из S3 и убрать ключ из attachmentS3Keys складского движения */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; mid: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем принадлежность проекта к организации пользователя
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверяем принадлежность складского движения к проекту
    const movement = await db.warehouseMovement.findFirst({
      where: { id: params.mid, projectId: params.projectId },
      select: { attachmentS3Keys: true },
    });
    if (!movement) return errorResponse('Складское движение не найдено', 404);

    const { searchParams } = new URL(req.url);
    const s3Key = searchParams.get('key');
    if (!s3Key) return errorResponse('Ключ файла не передан', 400);

    // Проверяем что ключ принадлежит этому складскому движению
    if (!movement.attachmentS3Keys.includes(s3Key)) {
      return errorResponse('Файл не найден в складском движении', 404);
    }

    await deleteFile(s3Key);

    // Удаляем ключ из массива вложений складского движения
    const updated = await db.warehouseMovement.update({
      where: { id: params.mid },
      data: { attachmentS3Keys: movement.attachmentS3Keys.filter((k) => k !== s3Key) },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления вложения складского движения');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
