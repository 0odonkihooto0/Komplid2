import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { createProjectDocumentSchema } from '@/lib/validations/project-document';
import { generateUploadUrl, buildProjectDocKey } from '@/lib/s3-utils';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Список документов в папке
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');
    if (!folderId) return errorResponse('Параметр folderId обязателен', 400);

    // Проверить что папка принадлежит проекту
    const folder = await db.projectFolder.findFirst({
      where: { id: folderId, projectId: params.projectId },
    });
    if (!folder) return errorResponse('Папка не найдена', 404);

    const documents = await db.projectDocument.findMany({
      where: { folderId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return successResponse(documents);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения документов проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

// Создать документ и получить presigned URL для загрузки
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createProjectDocumentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Ошибка валидации', 400, parsed.error.issues);

    const { name, folderId, fileName, mimeType, fileSize, description } = parsed.data;

    // Проверить что папка принадлежит проекту
    const folder = await db.projectFolder.findFirst({
      where: { id: folderId, projectId: params.projectId },
    });
    if (!folder) return errorResponse('Папка не найдена', 404);

    const s3Key = buildProjectDocKey(session.user.organizationId, params.projectId, fileName);
    const qrToken = randomUUID();

    const document = await db.projectDocument.create({
      data: {
        name,
        description,
        version: 1,
        isActual: true,
        s3Key,
        fileName,
        mimeType,
        fileSize,
        qrToken,
        folderId,
        uploadedById: session.user.id,
      },
    });

    // Presigned URL для загрузки файла клиентом напрямую в S3 (TTL 15 минут)
    const presignedUrl = await generateUploadUrl(s3Key, mimeType);

    return successResponse({ document, presignedUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания документа проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
