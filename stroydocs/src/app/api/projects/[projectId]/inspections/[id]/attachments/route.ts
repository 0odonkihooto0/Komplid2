import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, deleteFile, buildS3Key, getDownloadUrl } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; id: string }

/** Получить список прикреплённых файлов с presigned URL */
export async function GET(
  _req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const { projectId, id } = params;

    const inspection = await db.inspection.findFirst({
      where: { id, projectId, buildingObject: { organizationId: session.user.organizationId } },
      select: { attachmentS3Keys: true },
    });
    if (!inspection) return errorResponse('Проверка не найдена', 404);

    const attachments = await Promise.all(
      (inspection.attachmentS3Keys as string[]).map(async (key: string) => ({
        s3Key: key,
        fileName: key.split('/').pop() ?? key,
        downloadUrl: await getDownloadUrl(key),
      })),
    );

    return successResponse(attachments);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения вложений проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Загрузить файл и прикрепить к проверке */
export async function POST(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const { projectId, id } = params;

    const inspection = await db.inspection.findFirst({
      where: { id, projectId, buildingObject: { organizationId: session.user.organizationId } },
      select: { id: true, attachmentS3Keys: true },
    });
    if (!inspection) return errorResponse('Проверка не найдена', 404);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return errorResponse('Файл не передан', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildS3Key(session.user.organizationId, 'inspection-attachments', file.name);

    await uploadFile(buffer, s3Key, file.type || 'application/octet-stream');

    const updated = await db.inspection.update({
      where: { id },
      data: { attachmentS3Keys: { push: s3Key } },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ s3Key, attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** Удалить прикреплённый файл */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Params },
) {
  try {
    const session = await getSessionOrThrow();
    const { projectId, id } = params;

    const inspection = await db.inspection.findFirst({
      where: { id, projectId, buildingObject: { organizationId: session.user.organizationId } },
      select: { id: true, attachmentS3Keys: true },
    });
    if (!inspection) return errorResponse('Проверка не найдена', 404);

    const { searchParams } = new URL(req.url);
    const s3Key = searchParams.get('key');
    if (!s3Key) return errorResponse('Ключ файла не передан', 400);

    if (!inspection.attachmentS3Keys.includes(s3Key)) {
      return errorResponse('Файл не найден', 404);
    }

    await deleteFile(s3Key);

    const updated = await db.inspection.update({
      where: { id },
      data: { attachmentS3Keys: (inspection.attachmentS3Keys as string[]).filter((k: string) => k !== s3Key) },
      select: { attachmentS3Keys: true },
    });

    return successResponse({ attachmentS3Keys: updated.attachmentS3Keys });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления вложения проверки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
