import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { generateUploadUrl, buildS3Key } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { addRFIAttachmentSchema } from '@/lib/validations/rfi';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; rfiId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const rfi = await db.rFI.findFirst({
      where: { id: params.rfiId, projectId: params.projectId },
    });
    if (!rfi) return errorResponse('RFI не найден', 404);

    const body = await req.json();
    const parsed = addRFIAttachmentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const s3Key = buildS3Key(session.user.organizationId, 'rfi', parsed.data.fileName);

    const uploadUrl = await generateUploadUrl(s3Key, parsed.data.mimeType);

    const attachment = await db.rFIAttachment.create({
      data: {
        rfiId: params.rfiId,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        s3Key,
      },
    });

    return successResponse({ attachment, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки вложения к RFI');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
