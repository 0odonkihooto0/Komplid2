import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { createArchiveDocumentSchema } from '@/lib/validations/archive';
import { successResponse, errorResponse } from '@/utils/api';
import { getDownloadUrl, generateUploadUrl, buildArchiveKey } from '@/lib/s3-utils';
import type { ArchiveCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category') as ArchiveCategory | null;

    const docs = await db.archiveDocument.findMany({
      where: {
        contractId: params.contractId,
        ...(category && { category }),
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Добавить URL для скачивания
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        downloadUrl: await getDownloadUrl(doc.s3Key).catch(() => null),
        certifiedDownloadUrl: doc.certifiedS3Key
          ? await getDownloadUrl(doc.certifiedS3Key).catch(() => null)
          : null,
      }))
    );

    return successResponse(docsWithUrls);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения архивных документов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { objectId: string; contractId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.objectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const body = await req.json();
    const parsed = createArchiveDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Ошибка валидации', 400, parsed.error.issues);
    }

    const { issueDate, ...rest } = parsed.data;

    // Генерация S3-ключа
    const s3Key = buildArchiveKey(
      session.user.organizationId,
      params.contractId,
      rest.category,
      rest.fileName
    );

    // Создание записи в БД
    const doc = await db.archiveDocument.create({
      data: {
        ...rest,
        s3Key,
        issueDate: issueDate ? new Date(issueDate) : null,
        contractId: params.contractId,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Генерация pre-signed URL для загрузки файла
    const uploadUrl = await generateUploadUrl(s3Key, rest.mimeType);

    return successResponse({ ...doc, uploadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания архивного документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
