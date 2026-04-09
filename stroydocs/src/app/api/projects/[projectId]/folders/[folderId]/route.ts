import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { updateProjectFolderSchema } from '@/lib/validations/project-document';
import { deleteFile } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; folderId: string };

// Вспомогательная функция: проверить доступ к папке
async function getFolder(projectId: string, folderId: string, organizationId: string) {
  const project = await db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) return null;

  return db.projectFolder.findFirst({ where: { id: folderId, projectId } });
}

// Переименовать / изменить порядок папки
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const folder = await getFolder(params.projectId, params.folderId, session.user.organizationId);
    if (!folder) return errorResponse('Папка не найдена', 404);

    const body = await req.json();
    const parsed = updateProjectFolderSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const updated = await db.projectFolder.update({
      where: { id: params.folderId },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления папки проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Удалить папку вместе с документами (S3 + БД)
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const folder = await getFolder(params.projectId, params.folderId, session.user.organizationId);
    if (!folder) return errorResponse('Папка не найдена', 404);

    // Запретить удаление закреплённых системных папок
    if (folder.pinTop) {
      return errorResponse('Системную папку нельзя удалить', 400);
    }

    // Получить все документы в папке (включая файлы версий)
    const documents = await db.projectDocument.findMany({
      where: { folderId: params.folderId },
      include: { versions: { select: { s3Key: true } } },
    });

    // Удалить файлы из S3
    if (documents.length > 0) {
      const s3Keys = documents.flatMap((d: { s3Key: string; versions: { s3Key: string }[] }) => [
        d.s3Key,
        ...d.versions.map((v: { s3Key: string }) => v.s3Key),
      ]);
      await Promise.allSettled(s3Keys.map((key: string) => deleteFile(key)));

      // Удалить записи документов из БД (версии удалятся каскадно)
      await db.projectDocument.deleteMany({ where: { folderId: params.folderId } });
    }

    await db.projectFolder.delete({ where: { id: params.folderId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления папки проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
