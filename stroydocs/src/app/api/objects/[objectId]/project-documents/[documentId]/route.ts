import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { s3 } from '@/lib/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

type Params = { objectId: string; documentId: string };

// Вспомогательная: проверить доступ к документу
async function findDocument(projectId: string, documentId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.projectDocument.findFirst({
    where: { id: documentId, folder: { projectId } },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      versions: { orderBy: { createdAt: 'desc' } },
      folder: { select: { id: true, name: true } },
    },
  });
}

// Получить детали документа со всеми версиями
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const document = await findDocument(params.objectId, params.documentId, session.user.organizationId);
    if (!document) return errorResponse('Документ не найден', 404);

    return successResponse(document);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документа проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить документ (из S3 и из БД)
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const document = await findDocument(params.objectId, params.documentId, session.user.organizationId);
    if (!document) return errorResponse('Документ не найден', 404);

    // Удалить основной файл из S3
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: document.s3Key,
    })).catch((err: unknown) => logger.warn({ err }, 'Не удалось удалить файл из S3'));

    // Удалить файлы версий из S3
    for (const version of document.versions) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: version.s3Key,
      })).catch((err: unknown) => logger.warn({ err }, 'Не удалось удалить версию из S3'));
    }

    await db.projectDocument.delete({ where: { id: params.documentId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления документа проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
