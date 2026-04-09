import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { generateUploadUrl, buildS3Key } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { addCorrespondenceAttachmentSchema } from '@/lib/validations/correspondence';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; corrId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const correspondence = await db.correspondence.findFirst({
      where: { id: params.corrId, projectId: params.objectId },
    });
    if (!correspondence) return errorResponse('Письмо не найдено', 404);

    const body = await req.json();
    const parsed = addCorrespondenceAttachmentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const s3Key = buildS3Key(session.user.organizationId, 'correspondence', parsed.data.fileName);

    // Генерируем upload URL до создания записи в БД
    const uploadUrl = await generateUploadUrl(s3Key, parsed.data.mimeType);

    const attachment = await db.correspondenceAttachment.create({
      data: {
        correspondenceId: params.corrId,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        s3Key,
      },
    });

    return successResponse({ attachment, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения к письму');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
