import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { s3 } from '@/lib/s3';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; documentId: string };

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
    const document = await findDocument(params.projectId, params.documentId, session.user.organizationId);
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
    const document = await findDocument(params.projectId, params.documentId, session.user.organizationId);
    if (!document) return errorResponse('Документ не найден', 404);

    // Собрать все S3-ключи: основной файл + все версии
    const allKeys = [document.s3Key, ...document.versions.map((v) => v.s3Key)];

    const CHUNK_SIZE = 1000; // AWS S3 лимит: не более 1000 ключей за запрос
    for (let i = 0; i < allKeys.length; i += CHUNK_SIZE) {
      const chunk = allKeys.slice(i, i + CHUNK_SIZE);
      const result = await s3
        .send(new DeleteObjectsCommand({
          Bucket: process.env.S3_BUCKET!,
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: false },
        }))
        .catch((err: unknown) => {
          logger.warn({ err }, 'Не удалось выполнить пакетное удаление из S3');
          return null;
        });
      if (result?.Errors?.length) {
        for (const s3Err of result.Errors) {
          logger.warn({ key: s3Err.Key, code: s3Err.Code, message: s3Err.Message }, 'Ошибка удаления объекта из S3');
        }
      }
    }

    await db.projectDocument.delete({ where: { id: params.documentId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления документа проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
