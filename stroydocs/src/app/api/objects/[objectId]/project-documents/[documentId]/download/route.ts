import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { getDownloadUrl } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type Params = { objectId: string; documentId: string };

// Получить pre-signed URL для скачивания документа (TTL: 1 час)
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    // Проверить доступ к проекту через organizationId
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Найти документ в папке проекта
    const document = await db.projectDocument.findFirst({
      where: { id: params.documentId, folder: { projectId: params.objectId } },
      select: { id: true, s3Key: true, fileName: true, mimeType: true },
    });
    if (!document) return errorResponse('Документ не найден', 404);

    const url = await getDownloadUrl(document.s3Key);

    return successResponse({ url, fileName: document.fileName, mimeType: document.mimeType });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации ссылки на скачивание документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
