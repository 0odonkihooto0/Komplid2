import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { generateUploadUrl, buildS3Key } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { addSEDAttachmentSchema } from '@/lib/validations/sed';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; docId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.sEDDocument.findFirst({
      where: { id: params.docId, projectId: params.projectId },
    });
    if (!doc) return errorResponse('СЭД-документ не найден', 404);

    const body = await req.json();
    const parsed = addSEDAttachmentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const s3Key = buildS3Key(session.user.organizationId, 'sed', parsed.data.fileName);

    const uploadUrl = await generateUploadUrl(s3Key, parsed.data.mimeType);

    const attachment = await db.sEDAttachment.create({
      data: {
        sedDocId: params.docId,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        s3Key,
      },
    });

    return successResponse({ attachment, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения к СЭД-документу');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
