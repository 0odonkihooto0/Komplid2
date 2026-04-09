import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { uploadEstimateSchema } from '@/lib/validations/estimate';
import { successResponse, errorResponse } from '@/utils/api';
import { buildEstimateKey, generateUploadUrl } from '@/lib/s3-utils';
import { detectFormatByMime } from '@/lib/estimates/detect-format';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** POST — инициализация загрузки файла сметы (создаёт запись + pre-signed URL) */
export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка доступа к проекту
    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Проверка существования договора
    const contract = await db.contract.findFirst({
      where: { id: params.contractId, projectId: params.objectId },
    });
    if (!contract) return errorResponse('Договор не найден', 404);

    // Валидация тела запроса
    const body = await req.json();
    const parsed = uploadEstimateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { fileName, mimeType, size } = parsed.data;

    // Определяем формат файла заранее, чтобы prepare-chunks мог его проверить
    const format = detectFormatByMime(fileName, mimeType);

    // Генерируем S3-ключ
    const s3Key = buildEstimateKey(
      session.user.organizationId,
      params.contractId,
      fileName
    );

    // Создаём запись об импорте
    const estimateImport = await db.estimateImport.create({
      data: {
        fileName,
        fileS3Key: s3Key,
        mimeType,
        size,
        format: format ?? undefined,
        status: 'UPLOADING',
        contractId: params.contractId,
        createdById: session.user.id,
      },
    });

    // Генерируем pre-signed URL для загрузки
    const uploadUrl = await generateUploadUrl(s3Key, mimeType);

    logger.info(
      { importId: estimateImport.id, fileName, contractId: params.contractId },
      'Инициализирован импорт сметы'
    );

    return successResponse({ import: estimateImport, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка инициализации импорта сметы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
