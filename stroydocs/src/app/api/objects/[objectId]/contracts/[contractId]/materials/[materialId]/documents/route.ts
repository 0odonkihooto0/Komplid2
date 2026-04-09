import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createMaterialDocumentSchema } from '@/lib/validations/material';
import { generateUploadUrl, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const documents = await db.materialDocument.findMany({
      where: { materialId: params.materialId },
      orderBy: { uploadedAt: 'desc' },
    });

    // Добавляем pre-signed URL для скачивания
    const result = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        downloadUrl: await getDownloadUrl(doc.s3Key),
      }))
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документов материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string; materialId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createMaterialDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const s3Key = buildS3Key(
      session.user.organizationId,
      'material-documents',
      parsed.data.fileName
    );

    const document = await db.materialDocument.create({
      data: {
        type: parsed.data.type,
        s3Key,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        materialId: params.materialId,
      },
    });

    const uploadUrl = await generateUploadUrl(s3Key, parsed.data.mimeType);

    return successResponse({ document, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания документа материала');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
