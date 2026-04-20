import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { uploadVersionSchema } from '@/lib/validations/bim';

export const dynamic = 'force-dynamic';
/** POST /api/projects/[projectId]/bim/models/[modelId]/upload-version
 *  Добавить новую версию модели.
 *  Клиент предварительно загружает файл в S3 через presigned-url, затем вызывает этот роут.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; modelId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности модели
    const model = await db.bimModel.findFirst({
      where: {
        id: params.modelId,
        projectId: params.projectId,
        buildingObject: { organizationId: session.user.organizationId },
      },
    });
    if (!model) return errorResponse('Модель не найдена', 404);

    const body = await req.json();
    const parsed = uploadVersionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { name, comment, s3Key, fileName, fileSize, setAsCurrent } = parsed.data;

    // Определить номер следующей версии
    const lastVersion = await db.bimModelVersion.findFirst({
      where: { modelId: params.modelId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Создать запись версии
    const version = await db.bimModelVersion.create({
      data: {
        version: nextVersion,
        name,
        comment: comment ?? null,
        isCurrent: setAsCurrent,
        modelId: params.modelId,
        s3Key,
        fileName,
        fileSize: fileSize ?? null,
        uploadedById: session.user.id,
      },
    });

    // Если версия помечена как активная — обновить ключ основной модели
    if (setAsCurrent) {
      await db.bimModel.update({
        where: { id: params.modelId },
        data: { s3Key, fileName, fileSize: fileSize ?? null, updatedAt: new Date() },
      });

      // Снять флаг isCurrent с остальных версий
      await db.bimModelVersion.updateMany({
        where: { modelId: params.modelId, id: { not: version.id } },
        data: { isCurrent: false },
      });
    }

    return successResponse(version);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM upload-version POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
