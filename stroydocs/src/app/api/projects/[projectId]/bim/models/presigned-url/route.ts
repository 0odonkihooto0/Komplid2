import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { presignedUrlSchema } from '@/lib/validations/bim';
import { generateUploadUrl, buildBimModelKey } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';
/** POST /api/projects/[projectId]/bim/models/presigned-url
 *  Возвращает pre-signed URL для прямой загрузки IFC-файла в Timeweb S3 (TTL: 15 мин).
 *  Клиент загружает файл в S3, затем вызывает POST /bim/models с полученным s3Key.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const body = await req.json();
    const parsed = presignedUrlSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { fileName, mimeType } = parsed.data;

    // Проверить что файл является IFC-форматом
    const isIfc =
      fileName.toLowerCase().endsWith('.ifc') ||
      fileName.toLowerCase().endsWith('.ifcxml') ||
      fileName.toLowerCase().endsWith('.ifczip') ||
      mimeType === 'application/x-step' ||
      mimeType === 'application/octet-stream';

    if (!isIfc) {
      return errorResponse('Поддерживаются только файлы IFC (.ifc, .ifcXML, .ifcZIP)', 400);
    }

    const s3Key = buildBimModelKey(session.user.organizationId, params.projectId, fileName);
    const presignedUrl = await generateUploadUrl(s3Key, mimeType);

    return successResponse({ presignedUrl, s3Key });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'BIM presigned-url POST failed');
    return errorResponse('Внутренняя ошибка', 500);
  }
}
