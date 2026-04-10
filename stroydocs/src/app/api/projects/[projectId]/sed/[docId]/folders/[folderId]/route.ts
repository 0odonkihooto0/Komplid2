import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; docId: string; folderId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    // Найти связь документ ↔ папка
    const link = await db.sEDDocumentFolder.findFirst({
      where: { documentId: params.docId, folderId: params.folderId },
    });
    if (!link) return errorResponse('Документ не найден в данной папке', 404);

    await db.sEDDocumentFolder.delete({ where: { id: link.id } });

    return successResponse({ documentId: params.docId, folderId: params.folderId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления документа СЭД из папки');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
