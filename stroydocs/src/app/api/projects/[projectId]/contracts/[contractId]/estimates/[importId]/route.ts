import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { deleteFile } from '@/lib/s3-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET — один импорт со всеми позициями (для предпросмотра) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; importId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const estimateImport = await db.estimateImport.findFirst({
      where: {
        id: params.importId,
        contractId: params.contractId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            suggestedKsiNode: {
              select: { id: true, code: true, name: true },
            },
            childItems: {
              select: {
                id: true,
                rawName: true,
                rawUnit: true,
                volume: true,
                itemType: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!estimateImport) {
      return errorResponse('Импорт не найден', 404);
    }

    return successResponse(estimateImport);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения импорта сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

/** DELETE — удаление неподтверждённого импорта */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; importId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const estimateImport = await db.estimateImport.findFirst({
      where: {
        id: params.importId,
        contractId: params.contractId,
      },
    });

    if (!estimateImport) {
      return errorResponse('Импорт не найден', 404);
    }

    if (estimateImport.status === 'CONFIRMED') {
      return errorResponse('Нельзя удалить подтверждённый импорт', 400);
    }

    // Удаляем файл из S3
    try {
      await deleteFile(estimateImport.fileS3Key);
    } catch (s3Error) {
      logger.warn({ err: s3Error, s3Key: estimateImport.fileS3Key }, 'Ошибка удаления файла из S3');
    }

    // Удаляем запись (каскадно удалит items)
    await db.estimateImport.delete({
      where: { id: params.importId },
    });

    logger.info({ importId: params.importId }, 'Импорт сметы удалён');

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления импорта сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
