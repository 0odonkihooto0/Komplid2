import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { generateUploadUrl, buildEventProtocolKey } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

type Params = { objectId: string; eventId: string };

// Получить presigned URL для загрузки протокола мероприятия напрямую в S3
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const event = await db.projectEvent.findFirst({
      where: { id: params.eventId, projectId: params.objectId },
    });
    if (!event) return errorResponse('Мероприятие не найдено', 404);

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('fileName');
    const mimeType = searchParams.get('mimeType') ?? 'application/octet-stream';

    if (!fileName) return errorResponse('Параметр fileName обязателен', 400);

    // Формируем S3-ключ для протокола
    const s3Key = buildEventProtocolKey(
      session.user.organizationId,
      params.objectId,
      params.eventId,
      fileName,
    );

    // Presigned URL для загрузки клиентом напрямую в S3 (TTL 15 минут)
    const presignedUrl = await generateUploadUrl(s3Key, mimeType);

    return successResponse({ presignedUrl, s3Key });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения presigned URL для протокола мероприятия');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
