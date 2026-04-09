import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getDownloadUrl, deleteFile } from '@/lib/s3-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; archiveId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.archiveDocument.findFirst({
      where: { id: params.archiveId, contractId: params.contractId },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const downloadUrl = await getDownloadUrl(doc.s3Key);
    const certifiedDownloadUrl = doc.certifiedS3Key
      ? await getDownloadUrl(doc.certifiedS3Key)
      : null;

    return successResponse({ ...doc, downloadUrl, certifiedDownloadUrl });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения архивного документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; archiveId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.archiveDocument.findFirst({
      where: { id: params.archiveId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    const body = await req.json();
    const { sheetNumber, cipher, issueDate } = body;

    const updated = await db.archiveDocument.update({
      where: { id: params.archiveId },
      data: {
        ...(sheetNumber !== undefined && { sheetNumber }),
        ...(cipher !== undefined && { cipher }),
        ...(issueDate !== undefined && { issueDate: issueDate ? new Date(issueDate) : null }),
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка обновления архивного документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; archiveId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const doc = await db.archiveDocument.findFirst({
      where: { id: params.archiveId, contractId: params.contractId },
    });
    if (!doc) return errorResponse('Документ не найден', 404);

    // Удаление файлов из S3
    await deleteFile(doc.s3Key);
    if (doc.certifiedS3Key) {
      await deleteFile(doc.certifiedS3Key);
    }

    await db.archiveDocument.delete({ where: { id: params.archiveId } });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления архивного документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
