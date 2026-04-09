import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createDocumentVersionSchema } from '@/lib/validations/project-document';
import { generateUploadUrl, buildProjectDocKey } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; documentId: string };

// Получить историю версий документа
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const document = await db.projectDocument.findFirst({
      where: { id: params.documentId, folder: { projectId: params.projectId } },
    });
    if (!document) return errorResponse('Документ не найден', 404);

    const versions = await db.projectDocumentVersion.findMany({
      where: { documentId: params.documentId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(versions);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения версий документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Загрузить новую версию документа
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const document = await db.projectDocument.findFirst({
      where: { id: params.documentId, folder: { projectId: params.projectId } },
    });
    if (!document) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const parsed = createDocumentVersionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { fileName, fileSize, comment } = parsed.data;

    // Сохранить текущую версию в историю
    await db.projectDocumentVersion.create({
      data: {
        version: document.version,
        s3Key: document.s3Key,
        fileName: document.fileName,
        fileSize: document.fileSize,
        comment,
        documentId: document.id,
        uploadedById: session.user.id,
      },
    });

    // Новый S3 ключ для актуальной версии
    const newVersion = document.version + 1;
    const newS3Key = buildProjectDocKey(session.user.organizationId, params.projectId, fileName);

    // Обновить основную запись документа
    const updated = await db.projectDocument.update({
      where: { id: document.id },
      data: { version: newVersion, s3Key: newS3Key, fileName, fileSize },
    });

    // Presigned URL для загрузки новой версии (TTL 15 минут)
    const presignedUrl = await generateUploadUrl(newS3Key, document.mimeType);

    return successResponse({ document: updated, presignedUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки новой версии документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
