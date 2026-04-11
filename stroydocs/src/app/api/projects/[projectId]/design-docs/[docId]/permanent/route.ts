import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { deleteFile } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; docId: string } };

/**
 * DELETE /api/projects/[projectId]/design-docs/[docId]/permanent
 * Физически удалить документ ПИР: очистить файлы из S3, затем удалить запись из БД.
 * Требует предварительного мягкого удаления (isDeleted=true).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();

    const doc = await db.designDocument.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
      select: { id: true, isDeleted: true, s3Keys: true, qrCodeS3Key: true },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    if (!doc.isDeleted) {
      return errorResponse(
        'Документ не помечен на удаление. Сначала выполните мягкое удаление.',
        400,
      );
    }

    // Удалить все файлы из S3 (ошибки логируем, но не прерываем удаление)
    const keysToDelete = [...doc.s3Keys];
    if (doc.qrCodeS3Key) keysToDelete.push(doc.qrCodeS3Key);

    await Promise.allSettled(
      keysToDelete.map((key) =>
        deleteFile(key).catch((err) =>
          logger.warn({ err, key }, 'Не удалось удалить файл из S3 при permanent delete'),
        ),
      ),
    );

    // Физически удалить документ (CASCADE удалит comments, changes, registryItems)
    await db.designDocument.delete({ where: { id: params.docId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка физического удаления документа ПИР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
