import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; docId: string; linkId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const link = await db.sEDLink.findFirst({
      where: { id: params.linkId, documentId: params.docId },
    });
    if (!link) return errorResponse('Связь не найдена', 404);

    await db.sEDLink.delete({ where: { id: params.linkId } });

    return successResponse({ id: params.linkId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка удаления связи СЭД-документа');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
